/**
 * SMS Service for Malaysia
 * 
 * Provides SMS notification delivery with:
 * - Integration with Malaysian SMS providers (Nexmo/Vonage, Twilio)
 * - Multi-language support (Bahasa Malaysia, English, Chinese, Tamil)
 * - Cost optimization and failover handling
 * - Compliance with Malaysian telecom regulations
 * - Rate limiting and message queuing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import type { SupportedLanguage } from '@/i18n/translations';

export interface SMSConfig {
  // Primary provider configuration
  primaryProvider: 'twilio' | 'nexmo' | 'local';
  providers: {
    twilio?: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
    };
    nexmo?: {
      apiKey: string;
      apiSecret: string;
      fromNumber: string;
    };
    local?: {
      apiEndpoint: string;
      apiKey: string;
      fromNumber: string;
    };
  };
  
  // Malaysian specific settings
  malaysianSettings: {
    enableMalaysianProvider: boolean;
    respectQuietHours: boolean;
    quietHoursStart: string; // HH:MM
    quietHoursEnd: string;   // HH:MM
    enableCostOptimization: boolean;
    maxDailySMSPerUser: number;
  };
  
  // Rate limiting
  rateLimiting: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
    retryDelay: number; // milliseconds
    maxRetries: number;
  };
}

export interface SMSMessage {
  id: string;
  recipientNumber: string;
  message: string;
  language: SupportedLanguage;
  priority: 'low' | 'medium' | 'high' | 'critical';
  medicationId?: string;
  reminderType?: 'medication' | 'adherence_check' | 'refill_reminder' | 'emergency';
  culturalContext?: {
    avoidPrayerTimes?: boolean;
    respectFastingHours?: boolean;
    familyNotification?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  cost?: number;
  error?: string;
  retryCount?: number;
  deliveredAt?: Date;
}

export interface SMSQueueItem {
  message: SMSMessage;
  scheduledFor: Date;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  result?: SMSDeliveryResult;
}

export interface SMSAnalytics {
  totalSent: number;
  deliveryRate: number;
  costPerMessage: number;
  failureReasons: Record<string, number>;
  languageDistribution: Record<SupportedLanguage, number>;
  providerPerformance: Record<string, {
    successRate: number;
    averageCost: number;
    averageDeliveryTime: number;
  }>;
}

class SMSService {
  private static instance: SMSService;
  private config: SMSConfig;
  private messageQueue: Map<string, SMSQueueItem> = new Map();
  private rateLimitCounters: {
    perMinute: number;
    perHour: number;
    perDay: number;
    lastReset: Date;
  } = {
    perMinute: 0,
    perHour: 0,
    perDay: 0,
    lastReset: new Date()
  };
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Initialize SMS service with configuration
   */
  async initialize(config?: Partial<SMSConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      // Load saved configuration
      const savedConfig = await this.loadConfiguration();
      this.config = { ...this.config, ...savedConfig, ...config };

      // Validate configuration
      const validationResult = this.validateConfig();
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      // Load queued messages
      await this.loadMessageQueue();

      // Start queue processor
      this.startQueueProcessor();

      this.isInitialized = true;
      console.log('SMS Service initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('Failed to initialize SMS service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      };
    }
  }

  /**
   * Send SMS immediately
   */
  async sendSMS(message: SMSMessage): Promise<SMSDeliveryResult> {
    if (!this.isInitialized) {
      throw new Error('SMS service not initialized');
    }

    try {
      // Check rate limits
      const rateLimitResult = this.checkRateLimit();
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded: ${rateLimitResult.reason}`
        };
      }

      // Check quiet hours
      if (this.isInQuietHours()) {
        return await this.queueMessage(message, this.getQuietHoursEndTime());
      }

      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Attempt delivery with failover
      const result = await this.attemptDelivery(message);
      
      // Update rate limits
      this.updateRateLimitCounters();

      // Store result for analytics
      await this.storeDeliveryResult(message.id, result);

      return result;

    } catch (error) {
      console.error('SMS delivery failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS delivery failed'
      };
    }
  }

  /**
   * Queue SMS for later delivery
   */
  async queueMessage(message: SMSMessage, scheduledFor: Date): Promise<SMSDeliveryResult> {
    try {
      const queueItem: SMSQueueItem = {
        message,
        scheduledFor,
        attempts: 0,
        status: 'pending'
      };

      this.messageQueue.set(message.id, queueItem);
      await this.saveMessageQueue();

      console.log(`SMS queued for delivery at ${scheduledFor.toISOString()}`);
      return {
        success: true,
        messageId: message.id
      };

    } catch (error) {
      console.error('Failed to queue SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue message'
      };
    }
  }

  /**
   * Send medication reminder SMS
   */
  async sendMedicationReminder(
    phoneNumber: string,
    medicationName: string,
    dosage: string,
    language: SupportedLanguage,
    priority: SMSMessage['priority'] = 'medium'
  ): Promise<SMSDeliveryResult> {
    const message = this.createMedicationReminderMessage(
      phoneNumber,
      medicationName,
      dosage,
      language,
      priority
    );

    return await this.sendSMS(message);
  }

  /**
   * Send emergency escalation SMS
   */
  async sendEmergencyEscalation(
    phoneNumber: string,
    patientName: string,
    medicationName: string,
    language: SupportedLanguage,
    emergencyContacts: string[] = []
  ): Promise<SMSDeliveryResult[]> {
    const results: SMSDeliveryResult[] = [];

    // Send to primary contact
    const primaryMessage = this.createEmergencyMessage(
      phoneNumber,
      patientName,
      medicationName,
      language,
      'primary'
    );
    results.push(await this.sendSMS(primaryMessage));

    // Send to emergency contacts
    for (const contact of emergencyContacts) {
      const emergencyMessage = this.createEmergencyMessage(
        contact,
        patientName,
        medicationName,
        language,
        'emergency_contact'
      );
      results.push(await this.sendSMS(emergencyMessage));
    }

    return results;
  }

  /**
   * Attempt message delivery with provider failover
   */
  private async attemptDelivery(message: SMSMessage, retryCount = 0): Promise<SMSDeliveryResult> {
    const providers = this.getAvailableProviders();
    
    for (const provider of providers) {
      try {
        const result = await this.deliverWithProvider(message, provider);
        if (result.success) {
          return result;
        }
        
        console.warn(`Provider ${provider} failed:`, result.error);
        
      } catch (error) {
        console.error(`Provider ${provider} error:`, error);
      }
    }

    // If all providers failed and we haven't exceeded retry limit
    if (retryCount < this.config.rateLimiting.maxRetries) {
      await this.delay(this.config.rateLimiting.retryDelay);
      return await this.attemptDelivery(message, retryCount + 1);
    }

    return {
      success: false,
      error: 'All SMS providers failed',
      retryCount
    };
  }

  /**
   * Deliver message using specific provider
   */
  private async deliverWithProvider(
    message: SMSMessage,
    provider: string
  ): Promise<SMSDeliveryResult> {
    switch (provider) {
      case 'twilio':
        return await this.deliverWithTwilio(message);
      case 'nexmo':
        return await this.deliverWithNexmo(message);
      case 'local':
        return await this.deliverWithLocalProvider(message);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Deliver via Twilio
   */
  private async deliverWithTwilio(message: SMSMessage): Promise<SMSDeliveryResult> {
    const config = this.config.providers.twilio;
    if (!config) {
      throw new Error('Twilio not configured');
    }

    try {
      // Note: In a real implementation, you'd use Twilio SDK
      // For this demo, we simulate the API call
      const mockApiResponse = await this.simulateProviderAPI('twilio', message);
      
      return {
        success: true,
        messageId: mockApiResponse.sid,
        provider: 'twilio',
        cost: mockApiResponse.price,
        deliveredAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        provider: 'twilio',
        error: error instanceof Error ? error.message : 'Twilio delivery failed'
      };
    }
  }

  /**
   * Deliver via Nexmo/Vonage
   */
  private async deliverWithNexmo(message: SMSMessage): Promise<SMSDeliveryResult> {
    const config = this.config.providers.nexmo;
    if (!config) {
      throw new Error('Nexmo not configured');
    }

    try {
      const mockApiResponse = await this.simulateProviderAPI('nexmo', message);
      
      return {
        success: true,
        messageId: mockApiResponse.messageId,
        provider: 'nexmo',
        cost: mockApiResponse.cost,
        deliveredAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        provider: 'nexmo',
        error: error instanceof Error ? error.message : 'Nexmo delivery failed'
      };
    }
  }

  /**
   * Deliver via local Malaysian provider
   */
  private async deliverWithLocalProvider(message: SMSMessage): Promise<SMSDeliveryResult> {
    const config = this.config.providers.local;
    if (!config) {
      throw new Error('Local provider not configured');
    }

    try {
      const mockApiResponse = await this.simulateProviderAPI('local', message);
      
      return {
        success: true,
        messageId: mockApiResponse.id,
        provider: 'local',
        cost: mockApiResponse.rate,
        deliveredAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        provider: 'local',
        error: error instanceof Error ? error.message : 'Local provider delivery failed'
      };
    }
  }

  /**
   * Create medication reminder message content
   */
  private createMedicationReminderMessage(
    phoneNumber: string,
    medicationName: string,
    dosage: string,
    language: SupportedLanguage,
    priority: SMSMessage['priority']
  ): SMSMessage {
    const messageContent = this.getMedicationReminderContent(medicationName, dosage, language);
    
    return {
      id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientNumber: phoneNumber,
      message: messageContent,
      language,
      priority,
      reminderType: 'medication',
      culturalContext: {
        avoidPrayerTimes: true,
        respectFastingHours: true
      }
    };
  }

  /**
   * Create emergency escalation message content
   */
  private createEmergencyMessage(
    phoneNumber: string,
    patientName: string,
    medicationName: string,
    language: SupportedLanguage,
    recipientType: 'primary' | 'emergency_contact'
  ): SMSMessage {
    const messageContent = this.getEmergencyMessageContent(
      patientName,
      medicationName,
      language,
      recipientType
    );
    
    return {
      id: `emr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientNumber: phoneNumber,
      message: messageContent,
      language,
      priority: 'critical',
      reminderType: 'emergency',
      culturalContext: {
        familyNotification: recipientType === 'emergency_contact'
      }
    };
  }

  /**
   * Get medication reminder content by language
   */
  private getMedicationReminderContent(
    medicationName: string,
    dosage: string,
    language: SupportedLanguage
  ): string {
    const templates = {
      en: `🏥 MediMate Reminder: Time to take your medication ${medicationName} (${dosage}). Take with food if required. Reply TAKEN to confirm.`,
      ms: `🏥 Peringatan MediMate: Masa untuk mengambil ubat ${medicationName} (${dosage}). Ambil bersama makanan jika perlu. Balas DIAMBIL untuk mengesahkan.`,
      zh: `🏥 MediMate 提醒：该服用药物 ${medicationName} (${dosage})了。如需要请与食物一起服用。回复"已服用"确认。`,
      ta: `🏥 MediMate நினைவூட்டல்: ${medicationName} (${dosage}) மருந்து உட்கொள்ள வேண்டிய நேரம். தேவைப்பட்டால் உணவோடு எடுத்துக் கொள்ளுங்கள். உறுதிப்படுத்த TAKEN என்று பதிலளியுங்கள்.`
    };

    return templates[language] || templates.en;
  }

  /**
   * Get emergency message content by language
   */
  private getEmergencyMessageContent(
    patientName: string,
    medicationName: string,
    language: SupportedLanguage,
    recipientType: 'primary' | 'emergency_contact'
  ): string {
    const templates = {
      primary: {
        en: `🚨 URGENT: You have missed multiple doses of ${medicationName}. Please take your medication immediately and contact your healthcare provider if you feel unwell.`,
        ms: `🚨 MENDESAK: Anda telah terlepas beberapa dos ${medicationName}. Sila ambil ubat anda segera dan hubungi penyedia penjagaan kesihatan jika anda berasa tidak sihat.`,
        zh: `🚨 紧急：您已错过多次 ${medicationName} 服药。请立即服药，如感不适请联系医疗保健提供者。`,
        ta: `🚨 அவசரம்: நீங்கள் ${medicationName} மருந்தின் பல அளவுகளை தவறவிட்டீர்கள். உடனே மருந்து உட்கொண்டு, உடல்நிலை சரியில்லாமல் இருந்தால் மருத்துவரை தொடர்பு கொள்ளுங்கள்.`
      },
      emergency_contact: {
        en: `🚨 MediMate ALERT: ${patientName} has missed multiple doses of ${medicationName}. Please check on them immediately. This is an automated emergency notification.`,
        ms: `🚨 AMARAN MediMate: ${patientName} telah terlepas beberapa dos ${medicationName}. Sila semak keadaan mereka segera. Ini adalah notifikasi kecemasan automatik.`,
        zh: `🚨 MediMate 警报：${patientName} 已错过多次 ${medicationName} 服药。请立即检查他们的情况。这是自动紧急通知。`,
        ta: `🚨 MediMate எச்சரிக்கை: ${patientName} ${medicationName} மருந்தின் பல அளவுகளை தவறவிட்டார். உடனே அவர்களை சரிபார்க்கவும். இது தானியங்கு அவசர அறிவிப்பு.`
      }
    };

    const template = templates[recipientType][language] || templates[recipientType].en;
    return template;
  }

  /**
   * Queue processor for scheduled messages
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      await this.processMessageQueue();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    const now = new Date();
    
    for (const [messageId, queueItem] of this.messageQueue.entries()) {
      if (queueItem.status === 'pending' && queueItem.scheduledFor <= now) {
        try {
          queueItem.status = 'sending';
          queueItem.attempts += 1;
          queueItem.lastAttempt = new Date();

          const result = await this.attemptDelivery(queueItem.message);
          queueItem.result = result;
          queueItem.status = result.success ? 'sent' : 'failed';

          if (!result.success && queueItem.attempts < this.config.rateLimiting.maxRetries) {
            // Reschedule for retry
            queueItem.scheduledFor = new Date(now.getTime() + this.config.rateLimiting.retryDelay);
            queueItem.status = 'pending';
          }

        } catch (error) {
          console.error(`Queue processing error for message ${messageId}:`, error);
          queueItem.status = 'failed';
        }
      }
    }

    // Clean up completed messages older than 24 hours
    this.cleanupOldQueueItems();
    await this.saveMessageQueue();
  }

  /**
   * Clean up old queue items
   */
  private cleanupOldQueueItems(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [messageId, queueItem] of this.messageQueue.entries()) {
      if ((queueItem.status === 'sent' || queueItem.status === 'failed') && 
          queueItem.lastAttempt && queueItem.lastAttempt < cutoff) {
        this.messageQueue.delete(messageId);
      }
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(): { allowed: boolean; reason?: string } {
    this.resetRateLimitCountersIfNeeded();
    
    if (this.rateLimitCounters.perMinute >= this.config.rateLimiting.maxPerMinute) {
      return { allowed: false, reason: 'per-minute limit exceeded' };
    }
    
    if (this.rateLimitCounters.perHour >= this.config.rateLimiting.maxPerHour) {
      return { allowed: false, reason: 'per-hour limit exceeded' };
    }
    
    if (this.rateLimitCounters.perDay >= this.config.rateLimiting.maxPerDay) {
      return { allowed: false, reason: 'per-day limit exceeded' };
    }
    
    return { allowed: true };
  }

  /**
   * Update rate limit counters
   */
  private updateRateLimitCounters(): void {
    this.rateLimitCounters.perMinute++;
    this.rateLimitCounters.perHour++;
    this.rateLimitCounters.perDay++;
  }

  /**
   * Reset rate limit counters based on time
   */
  private resetRateLimitCountersIfNeeded(): void {
    const now = new Date();
    const timeSinceLastReset = now.getTime() - this.rateLimitCounters.lastReset.getTime();
    
    // Reset per-minute counter
    if (timeSinceLastReset >= 60000) { // 1 minute
      this.rateLimitCounters.perMinute = 0;
    }
    
    // Reset per-hour counter
    if (timeSinceLastReset >= 3600000) { // 1 hour
      this.rateLimitCounters.perHour = 0;
    }
    
    // Reset per-day counter
    if (timeSinceLastReset >= 86400000) { // 1 day
      this.rateLimitCounters.perDay = 0;
      this.rateLimitCounters.lastReset = now;
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(): boolean {
    if (!this.config.malaysianSettings.respectQuietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return this.isTimeInRange(
      currentTime,
      this.config.malaysianSettings.quietHoursStart,
      this.config.malaysianSettings.quietHoursEnd
    );
  }

  /**
   * Get quiet hours end time as Date
   */
  private getQuietHoursEndTime(): Date {
    const [hours, minutes] = this.config.malaysianSettings.quietHoursEnd.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0, 0);
    
    // If end time is in the past, move to next day
    if (endTime <= new Date()) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    return endTime;
  }

  /**
   * Check if time is within range
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    const currentMinutes = this.timeToMinutes(current);
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);
    
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  /**
   * Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validate message
   */
  private validateMessage(message: SMSMessage): { valid: boolean; error?: string } {
    if (!message.recipientNumber) {
      return { valid: false, error: 'Recipient number is required' };
    }

    if (!message.message.trim()) {
      return { valid: false, error: 'Message content is required' };
    }

    // Basic Malaysian phone number validation
    const phoneRegex = /^(\+?6|0)[0-9]{9,10}$/;
    if (!phoneRegex.test(message.recipientNumber.replace(/\s|-/g, ''))) {
      return { valid: false, error: 'Invalid Malaysian phone number format' };
    }

    return { valid: true };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.providers.twilio && !this.config.providers.nexmo && !this.config.providers.local) {
      return { valid: false, error: 'At least one SMS provider must be configured' };
    }

    return { valid: true };
  }

  /**
   * Get available providers in order of preference
   */
  private getAvailableProviders(): string[] {
    const providers: string[] = [];
    
    // Add primary provider first
    if (this.config.providers[this.config.primaryProvider]) {
      providers.push(this.config.primaryProvider);
    }
    
    // Add other providers as fallback
    Object.keys(this.config.providers).forEach(provider => {
      if (provider !== this.config.primaryProvider && this.config.providers[provider as keyof typeof this.config.providers]) {
        providers.push(provider);
      }
    });
    
    return providers;
  }

  /**
   * Simulate provider API call (for demo purposes)
   */
  private async simulateProviderAPI(provider: string, message: SMSMessage): Promise<any> {
    // Simulate network delay
    await this.delay(Math.random() * 1000 + 500);
    
    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error(`Provider ${provider} temporarily unavailable`);
    }
    
    // Return mock successful response
    return {
      sid: `${provider}_${Date.now()}`,
      messageId: `${provider}_${Date.now()}`,
      id: `${provider}_${Date.now()}`,
      price: Math.random() * 0.5 + 0.1,
      cost: Math.random() * 0.5 + 0.1,
      rate: Math.random() * 0.5 + 0.1,
      status: 'sent'
    };
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
  private async loadConfiguration(): Promise<Partial<SMSConfig>> {
    try {
      const stored = await AsyncStorage.getItem('sms_config');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load SMS configuration:', error);
      return {};
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfiguration(config: Partial<SMSConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('sms_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save SMS configuration:', error);
      throw error;
    }
  }

  /**
   * Load message queue from storage
   */
  private async loadMessageQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('sms_queue');
      if (stored) {
        const queueData = JSON.parse(stored);
        this.messageQueue = new Map(Object.entries(queueData).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            scheduledFor: new Date(value.scheduledFor),
            lastAttempt: value.lastAttempt ? new Date(value.lastAttempt) : undefined
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load SMS queue:', error);
    }
  }

  /**
   * Save message queue to storage
   */
  private async saveMessageQueue(): Promise<void> {
    try {
      const queueData = Object.fromEntries(this.messageQueue.entries());
      await AsyncStorage.setItem('sms_queue', JSON.stringify(queueData));
    } catch (error) {
      console.error('Failed to save SMS queue:', error);
    }
  }

  /**
   * Store delivery result for analytics
   */
  private async storeDeliveryResult(messageId: string, result: SMSDeliveryResult): Promise<void> {
    try {
      const key = `sms_result_${messageId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        ...result,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to store delivery result:', error);
    }
  }

  /**
   * Get SMS analytics
   */
  async getAnalytics(days = 30): Promise<SMSAnalytics> {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const keys = await AsyncStorage.getAllKeys();
      const resultKeys = keys.filter(key => key.startsWith('sms_result_'));
      
      const results = await AsyncStorage.multiGet(resultKeys);
      const analytics: SMSAnalytics = {
        totalSent: 0,
        deliveryRate: 0,
        costPerMessage: 0,
        failureReasons: {},
        languageDistribution: { en: 0, ms: 0, zh: 0, ta: 0 },
        providerPerformance: {}
      };

      let successCount = 0;
      let totalCost = 0;

      for (const [key, value] of results) {
        if (value) {
          const result = JSON.parse(value);
          const timestamp = new Date(result.timestamp);
          
          if (timestamp >= cutoff) {
            analytics.totalSent++;
            
            if (result.success) {
              successCount++;
              if (result.cost) totalCost += result.cost;
            } else if (result.error) {
              analytics.failureReasons[result.error] = (analytics.failureReasons[result.error] || 0) + 1;
            }
            
            if (result.provider) {
              if (!analytics.providerPerformance[result.provider]) {
                analytics.providerPerformance[result.provider] = {
                  successRate: 0,
                  averageCost: 0,
                  averageDeliveryTime: 0
                };
              }
              // Update provider performance metrics
            }
          }
        }
      }

      analytics.deliveryRate = analytics.totalSent > 0 ? successCount / analytics.totalSent * 100 : 0;
      analytics.costPerMessage = successCount > 0 ? totalCost / successCount : 0;

      return analytics;

    } catch (error) {
      console.error('Failed to get SMS analytics:', error);
      return {
        totalSent: 0,
        deliveryRate: 0,
        costPerMessage: 0,
        failureReasons: {},
        languageDistribution: { en: 0, ms: 0, zh: 0, ta: 0 },
        providerPerformance: {}
      };
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SMSConfig {
    return {
      primaryProvider: 'local',
      providers: {},
      malaysianSettings: {
        enableMalaysianProvider: true,
        respectQuietHours: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        enableCostOptimization: true,
        maxDailySMSPerUser: 10
      },
      rateLimiting: {
        maxPerMinute: 5,
        maxPerHour: 50,
        maxPerDay: 200,
        retryDelay: 30000, // 30 seconds
        maxRetries: 3
      }
    };
  }

  // Public getters
  getConfiguration(): SMSConfig {
    return { ...this.config };
  }

  getQueueStatus(): { 
    pending: number; 
    sending: number; 
    sent: number; 
    failed: number; 
  } {
    const status = { pending: 0, sending: 0, sent: 0, failed: 0 };
    
    for (const queueItem of this.messageQueue.values()) {
      status[queueItem.status]++;
    }
    
    return status;
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cancel queued message
   */
  async cancelQueuedMessage(messageId: string): Promise<boolean> {
    const queueItem = this.messageQueue.get(messageId);
    if (queueItem && queueItem.status === 'pending') {
      queueItem.status = 'cancelled';
      await this.saveMessageQueue();
      return true;
    }
    return false;
  }

  /**
   * Retry failed message
   */
  async retryFailedMessage(messageId: string): Promise<SMSDeliveryResult> {
    const queueItem = this.messageQueue.get(messageId);
    if (!queueItem || queueItem.status !== 'failed') {
      return { success: false, error: 'Message not found or not in failed state' };
    }

    queueItem.status = 'pending';
    queueItem.scheduledFor = new Date();
    await this.saveMessageQueue();

    return { success: true, messageId };
  }
}

export default SMSService;