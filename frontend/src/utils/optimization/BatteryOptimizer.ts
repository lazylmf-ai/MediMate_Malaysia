/**
 * Battery Optimizer Utility
 *
 * Core utility for Issue #24 Stream C - implements battery optimization algorithms
 * and monitoring for background processing and reminder delivery.
 *
 * Features:
 * - Battery level monitoring and alerts
 * - Adaptive processing based on battery state
 * - Charging state detection and optimization
 * - Background task throttling during low battery
 * - Battery usage analytics and forecasting
 * - Integration with device power management
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';

export interface BatteryState {
  level: number; // 0-1 (percentage as decimal)
  state: 'unknown' | 'unplugged' | 'charging' | 'full';
  lowPowerMode?: boolean;
  isCharging: boolean;
  timeToFullCharge?: number; // minutes
  timeToEmpty?: number; // minutes
}

export interface BatteryOptimization {
  isActive: boolean;
  level: 'none' | 'conservative' | 'moderate' | 'aggressive';
  description: string;
  restrictions: {
    backgroundProcessingReduced: boolean;
    syncFrequencyReduced: boolean;
    notificationsBatched: boolean;
    nonCriticalTasksDeferred: boolean;
    visualEffectsReduced: boolean;
  };
  estimatedBatterySavings: number; // percentage per hour
}

export interface BatteryUsageStats {
  today: {
    appUsage: number; // percentage of total battery used by app
    backgroundUsage: number;
    reminderDelivery: number;
    syncOperations: number;
    estimatedRemaining: number; // hours until empty
  };
  weekly: {
    averageDailyUsage: number;
    peakUsageHours: string[]; // HH:MM format
    backgroundPercentage: number;
    trends: {
      increasing: boolean;
      stable: boolean;
      decreasing: boolean;
    };
  };
  optimizationImpact: {
    batterySaved: number; // percentage saved due to optimizations
    performanceImpact: number; // 0-1 scale
    userSatisfaction: number; // 0-1 scale based on delivery success
  };
}

export interface OptimizationConfig {
  thresholds: {
    lowBattery: number; // percentage
    criticalBattery: number; // percentage
    conservativeMode: number; // percentage
    aggressiveMode: number; // percentage
  };
  adaptiveBehavior: {
    enabled: boolean;
    learningPeriodDays: number;
    adaptToUserPatterns: boolean;
    respectChargingSchedule: boolean;
  };
  restrictions: {
    backgroundProcessing: {
      lowBattery: 'reduce' | 'defer' | 'disable';
      criticalBattery: 'reduce' | 'defer' | 'disable';
    };
    syncOperations: {
      lowBattery: 'wifi_only' | 'defer' | 'disable';
      criticalBattery: 'wifi_only' | 'defer' | 'disable';
    };
    reminderDelivery: {
      lowBattery: 'batch' | 'critical_only' | 'normal';
      criticalBattery: 'batch' | 'critical_only' | 'normal';
    };
  };
  monitoring: {
    updateIntervalSeconds: number;
    trackUsagePatterns: boolean;
    predictBatteryLife: boolean;
  };
}

class BatteryOptimizer {
  private static instance: BatteryOptimizer;
  private config: OptimizationConfig;
  private currentState: BatteryState;
  private currentOptimization: BatteryOptimization;
  private usageStats: BatteryUsageStats;
  private isInitialized = false;

  // Monitoring state
  private batteryMonitoringActive = false;
  private batteryStateSubscription?: Battery.BatteryStateSubscription;
  private batteryLevelSubscription?: Battery.BatteryLevelSubscription;

  // Usage tracking
  private usageStartTime = Date.now();
  private backgroundTaskUsage: Array<{ timestamp: Date; usage: number; type: string }> = [];
  private chargingPatterns: Array<{ start: Date; end?: Date; startLevel: number; endLevel?: number }> = [];

  // Optimization history
  private optimizationHistory: Array<{
    timestamp: Date;
    optimization: BatteryOptimization;
    triggeredBy: string;
    duration: number;
    batterySaved: number;
  }> = [];

  // Storage keys
  private readonly STORAGE_KEYS = {
    CONFIG: 'battery_optimizer_config',
    USAGE_STATS: 'battery_usage_stats',
    OPTIMIZATION_HISTORY: 'battery_optimization_history',
    CHARGING_PATTERNS: 'battery_charging_patterns'
  };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.currentState = this.getDefaultBatteryState();
    this.currentOptimization = this.getDefaultOptimization();
    this.usageStats = this.getDefaultUsageStats();
  }

  static getInstance(): BatteryOptimizer {
    if (!BatteryOptimizer.instance) {
      BatteryOptimizer.instance = new BatteryOptimizer();
    }
    return BatteryOptimizer.instance;
  }

  /**
   * Initialize the battery optimizer
   */
  async initialize(config?: Partial<OptimizationConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Battery Optimizer...');

      // Load saved configuration
      await this.loadConfiguration();
      if (config) {
        this.config = { ...this.config, ...config };
        await this.saveConfiguration();
      }

      // Load historical data
      await this.loadUsageStats();
      await this.loadOptimizationHistory();
      await this.loadChargingPatterns();

      // Check if battery monitoring is available
      const batteryState = await Battery.getBatteryStateAsync();
      const batteryLevel = await Battery.getBatteryLevelAsync();

      this.currentState = {
        level: batteryLevel,
        state: batteryState,
        isCharging: batteryState === Battery.BatteryState.CHARGING,
        lowPowerMode: Platform.OS === 'ios' ? await Battery.isLowPowerModeEnabledAsync() : false
      };

      // Start battery monitoring
      if (this.config.monitoring.updateIntervalSeconds > 0) {
        await this.startBatteryMonitoring();
      }

      // Evaluate initial optimization level
      await this.evaluateOptimizationLevel();

      // Start usage tracking
      this.startUsageTracking();

      this.isInitialized = true;
      console.log('Battery Optimizer initialized successfully');

      return { success: true };

    } catch (error) {
      console.error('Failed to initialize Battery Optimizer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Get current battery state
   */
  async getBatteryState(): Promise<BatteryState> {
    try {
      if (!this.isInitialized) {
        throw new Error('Battery Optimizer not initialized');
      }

      // Get fresh battery data
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();
      const lowPowerMode = Platform.OS === 'ios' ? await Battery.isLowPowerModeEnabledAsync() : false;

      this.currentState = {
        level: batteryLevel,
        state: batteryState,
        isCharging: batteryState === Battery.BatteryState.CHARGING,
        lowPowerMode,
        timeToFullCharge: this.estimateTimeToFullCharge(),
        timeToEmpty: this.estimateTimeToEmpty()
      };

      return { ...this.currentState };

    } catch (error) {
      console.error('Failed to get battery state:', error);
      return this.currentState;
    }
  }

  /**
   * Get current battery level as percentage
   */
  async getBatteryLevel(): Promise<number> {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      return Math.round(batteryLevel * 100);
    } catch (error) {
      console.error('Failed to get battery level:', error);
      return 50; // Default fallback
    }
  }

  /**
   * Get current optimization settings
   */
  getCurrentOptimization(): BatteryOptimization {
    return { ...this.currentOptimization };
  }

  /**
   * Evaluate and update optimization level
   */
  async evaluateOptimizationLevel(): Promise<BatteryOptimization> {
    try {
      const batteryLevel = this.currentState.level * 100;
      const isCharging = this.currentState.isCharging;
      const lowPowerMode = this.currentState.lowPowerMode;

      let newOptimization: BatteryOptimization;

      if (isCharging || batteryLevel > 80) {
        // No optimization needed when charging or high battery
        newOptimization = {
          isActive: false,
          level: 'none',
          description: 'No optimization needed',
          restrictions: {
            backgroundProcessingReduced: false,
            syncFrequencyReduced: false,
            notificationsBatched: false,
            nonCriticalTasksDeferred: false,
            visualEffectsReduced: false
          },
          estimatedBatterySavings: 0
        };

      } else if (batteryLevel <= this.config.thresholds.criticalBattery || lowPowerMode) {
        // Aggressive optimization for critical battery
        newOptimization = {
          isActive: true,
          level: 'aggressive',
          description: 'Aggressive battery saving - critical level',
          restrictions: {
            backgroundProcessingReduced: true,
            syncFrequencyReduced: true,
            notificationsBatched: true,
            nonCriticalTasksDeferred: true,
            visualEffectsReduced: true
          },
          estimatedBatterySavings: 5.0 // 5% per hour
        };

      } else if (batteryLevel <= this.config.thresholds.lowBattery) {
        // Moderate optimization for low battery
        newOptimization = {
          isActive: true,
          level: 'moderate',
          description: 'Moderate battery saving - low level',
          restrictions: {
            backgroundProcessingReduced: true,
            syncFrequencyReduced: true,
            notificationsBatched: true,
            nonCriticalTasksDeferred: false,
            visualEffectsReduced: false
          },
          estimatedBatterySavings: 2.5 // 2.5% per hour
        };

      } else if (batteryLevel <= this.config.thresholds.conservativeMode) {
        // Conservative optimization
        newOptimization = {
          isActive: true,
          level: 'conservative',
          description: 'Conservative battery saving',
          restrictions: {
            backgroundProcessingReduced: false,
            syncFrequencyReduced: true,
            notificationsBatched: false,
            nonCriticalTasksDeferred: false,
            visualEffectsReduced: false
          },
          estimatedBatterySavings: 1.0 // 1% per hour
        };

      } else {
        // No optimization needed
        newOptimization = {
          isActive: false,
          level: 'none',
          description: 'Normal operation',
          restrictions: {
            backgroundProcessingReduced: false,
            syncFrequencyReduced: false,
            notificationsBatched: false,
            nonCriticalTasksDeferred: false,
            visualEffectsReduced: false
          },
          estimatedBatterySavings: 0
        };
      }

      // Check if optimization level changed
      if (newOptimization.level !== this.currentOptimization.level) {
        console.log(`Battery optimization changed from ${this.currentOptimization.level} to ${newOptimization.level}`);

        // Record optimization change
        this.recordOptimizationChange(newOptimization);

        this.currentOptimization = newOptimization;
        await this.notifyOptimizationChange(newOptimization);
      }

      return newOptimization;

    } catch (error) {
      console.error('Failed to evaluate optimization level:', error);
      return this.currentOptimization;
    }
  }

  /**
   * Record battery usage for a specific operation
   */
  async recordBatteryUsage(
    operationType: 'background_task' | 'sync' | 'reminder_delivery' | 'ui_interaction',
    estimatedUsage: number, // percentage
    duration: number, // milliseconds
    metadata?: any
  ): Promise<void> {
    try {
      const usage = {
        timestamp: new Date(),
        usage: estimatedUsage,
        type: operationType,
        duration,
        metadata: metadata || {}
      };

      this.backgroundTaskUsage.push(usage);

      // Update daily stats
      this.updateDailyUsageStats(operationType, estimatedUsage);

      // Trim old usage data (keep last 1000 entries)
      if (this.backgroundTaskUsage.length > 1000) {
        this.backgroundTaskUsage = this.backgroundTaskUsage.slice(-1000);
      }

      await this.saveUsageStats();

    } catch (error) {
      console.error('Failed to record battery usage:', error);
    }
  }

  /**
   * Get battery usage recommendations for an operation
   */
  getBatteryUsageRecommendations(
    operationType: 'background_task' | 'sync' | 'reminder_delivery',
    priority: 'low' | 'medium' | 'high' | 'critical'
  ): {
    shouldProceed: boolean;
    suggestedDelay?: number; // minutes
    alternativeApproach?: string;
    batteryCost: number; // estimated percentage
  } {
    try {
      const batteryLevel = this.currentState.level * 100;
      const optimization = this.currentOptimization;

      // Critical priority always proceeds
      if (priority === 'critical') {
        return {
          shouldProceed: true,
          batteryCost: this.estimateOperationCost(operationType)
        };
      }

      // Check optimization restrictions
      if (optimization.isActive) {
        switch (operationType) {
          case 'background_task':
            if (optimization.restrictions.backgroundProcessingReduced) {
              if (optimization.level === 'aggressive') {
                return {
                  shouldProceed: false,
                  suggestedDelay: 60, // 1 hour delay
                  alternativeApproach: 'Wait for charging or defer until critical',
                  batteryCost: this.estimateOperationCost(operationType)
                };
              } else {
                return {
                  shouldProceed: priority === 'high',
                  suggestedDelay: priority === 'medium' ? 30 : 120,
                  batteryCost: this.estimateOperationCost(operationType) * 1.5 // Higher cost due to optimization
                };
              }
            }
            break;

          case 'sync':
            if (optimization.restrictions.syncFrequencyReduced) {
              if (optimization.level === 'aggressive' && !this.currentState.isCharging) {
                return {
                  shouldProceed: false,
                  suggestedDelay: 120, // 2 hours delay
                  alternativeApproach: 'Wait for WiFi and charging, or defer to critical data only',
                  batteryCost: this.estimateOperationCost(operationType)
                };
              } else {
                return {
                  shouldProceed: priority === 'high',
                  suggestedDelay: 60,
                  batteryCost: this.estimateOperationCost(operationType)
                };
              }
            }
            break;

          case 'reminder_delivery':
            if (optimization.restrictions.notificationsBatched) {
              return {
                shouldProceed: true,
                alternativeApproach: 'Batch with other notifications to save battery',
                batteryCost: this.estimateOperationCost(operationType) * 0.7 // Reduced cost due to batching
              };
            }
            break;
        }
      }

      // Default: proceed with normal cost
      return {
        shouldProceed: true,
        batteryCost: this.estimateOperationCost(operationType)
      };

    } catch (error) {
      console.error('Failed to get battery usage recommendations:', error);
      return {
        shouldProceed: true,
        batteryCost: 0.1 // Fallback minimal cost
      };
    }
  }

  /**
   * Get battery usage statistics
   */
  getBatteryUsageStats(): BatteryUsageStats {
    return { ...this.usageStats };
  }

  /**
   * Predict battery life based on current usage patterns
   */
  async predictBatteryLife(): Promise<{
    hoursRemaining: number;
    willLastUntil: Date;
    confidence: number; // 0-1
    factors: string[];
  }> {
    try {
      const currentLevel = this.currentState.level * 100;
      const isCharging = this.currentState.isCharging;

      if (isCharging) {
        return {
          hoursRemaining: Infinity,
          willLastUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          confidence: 1.0,
          factors: ['Device is charging']
        };
      }

      // Calculate average usage rate from recent history
      const recentUsage = this.getRecentUsageRate();
      const baseUsageRate = recentUsage.hourly || 5; // Default 5% per hour

      // Apply optimization savings
      const optimizationSavings = this.currentOptimization.estimatedBatterySavings;
      const adjustedUsageRate = Math.max(1, baseUsageRate - optimizationSavings);

      // Calculate hours remaining
      const hoursRemaining = currentLevel / adjustedUsageRate;
      const willLastUntil = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);

      // Calculate confidence based on data availability
      const confidence = Math.min(1.0, recentUsage.dataPoints / 24); // Full confidence with 24+ hours of data

      const factors = [
        `Current usage rate: ${adjustedUsageRate.toFixed(1)}% per hour`,
        `Battery optimization: ${this.currentOptimization.level}`,
        `Recent patterns: ${recentUsage.dataPoints} hours of data`
      ];

      if (optimizationSavings > 0) {
        factors.push(`Optimization savings: ${optimizationSavings.toFixed(1)}% per hour`);
      }

      return {
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        willLastUntil,
        confidence,
        factors
      };

    } catch (error) {
      console.error('Failed to predict battery life:', error);
      return {
        hoursRemaining: 8, // Default 8 hours
        willLastUntil: new Date(Date.now() + 8 * 60 * 60 * 1000),
        confidence: 0.1,
        factors: ['Prediction failed, using default estimate']
      };
    }
  }

  /**
   * Check if device is in battery optimization mode
   */
  isOptimizationActive(): boolean {
    return this.currentOptimization.isActive;
  }

  /**
   * Get optimization level
   */
  getOptimizationLevel(): 'none' | 'conservative' | 'moderate' | 'aggressive' {
    return this.currentOptimization.level;
  }

  /**
   * Private helper methods
   */

  private async startBatteryMonitoring(): Promise<void> {
    try {
      if (this.batteryMonitoringActive) {
        return;
      }

      // Subscribe to battery level changes
      this.batteryLevelSubscription = await Battery.addBatteryLevelListener(({ batteryLevel }) => {
        const previousLevel = this.currentState.level;
        this.currentState.level = batteryLevel;

        // Check for significant changes
        if (Math.abs(previousLevel - batteryLevel) > 0.05) { // 5% change
          this.evaluateOptimizationLevel();
        }
      });

      // Subscribe to battery state changes
      this.batteryStateSubscription = await Battery.addBatteryStateListener(({ batteryState }) => {
        const wasCharging = this.currentState.isCharging;
        this.currentState.state = batteryState;
        this.currentState.isCharging = batteryState === Battery.BatteryState.CHARGING;

        // Handle charging state changes
        if (!wasCharging && this.currentState.isCharging) {
          this.onChargingStarted();
        } else if (wasCharging && !this.currentState.isCharging) {
          this.onChargingStopped();
        }
      });

      this.batteryMonitoringActive = true;
      console.log('Battery monitoring started');

    } catch (error) {
      console.error('Failed to start battery monitoring:', error);
    }
  }

  private stopBatteryMonitoring(): void {
    if (this.batteryLevelSubscription) {
      this.batteryLevelSubscription.remove();
      this.batteryLevelSubscription = undefined;
    }

    if (this.batteryStateSubscription) {
      this.batteryStateSubscription.remove();
      this.batteryStateSubscription = undefined;
    }

    this.batteryMonitoringActive = false;
    console.log('Battery monitoring stopped');
  }

  private startUsageTracking(): void {
    this.usageStartTime = Date.now();

    // Track usage patterns every 5 minutes
    setInterval(() => {
      this.trackUsagePattern();
    }, 5 * 60 * 1000);
  }

  private trackUsagePattern(): void {
    try {
      // This would implement detailed usage pattern tracking
      // For now, we'll update basic stats

      if (this.config.monitoring.trackUsagePatterns) {
        this.updateUsagePatterns();
      }

    } catch (error) {
      console.error('Failed to track usage pattern:', error);
    }
  }

  private onChargingStarted(): void {
    console.log('Charging started');

    const chargingSession = {
      start: new Date(),
      startLevel: this.currentState.level
    };

    this.chargingPatterns.push(chargingSession);
    this.evaluateOptimizationLevel();
  }

  private onChargingStopped(): void {
    console.log('Charging stopped');

    // Complete the most recent charging session
    const lastSession = this.chargingPatterns[this.chargingPatterns.length - 1];
    if (lastSession && !lastSession.end) {
      lastSession.end = new Date();
      lastSession.endLevel = this.currentState.level;
    }

    this.evaluateOptimizationLevel();
    this.saveChargingPatterns();
  }

  private estimateTimeToFullCharge(): number | undefined {
    if (!this.currentState.isCharging) {
      return undefined;
    }

    const currentLevel = this.currentState.level;
    const remainingCharge = 1.0 - currentLevel;

    // Use charging patterns to estimate
    const averageChargingRate = this.getAverageChargingRate();
    if (averageChargingRate > 0) {
      return (remainingCharge / averageChargingRate) * 60; // Convert to minutes
    }

    // Default estimate
    return remainingCharge * 120; // 2 hours to full charge
  }

  private estimateTimeToEmpty(): number | undefined {
    if (this.currentState.isCharging) {
      return undefined;
    }

    const currentLevel = this.currentState.level;
    const recentUsage = this.getRecentUsageRate();

    if (recentUsage.hourly > 0) {
      return (currentLevel * 100) / recentUsage.hourly * 60; // Convert to minutes
    }

    // Default estimate
    return currentLevel * 100 / 5 * 60; // 5% per hour default
  }

  private getAverageChargingRate(): number {
    // Calculate average charging rate from historical data
    const recentCharging = this.chargingPatterns
      .filter(session => session.end && session.endLevel)
      .slice(-10); // Last 10 charging sessions

    if (recentCharging.length === 0) {
      return 0.5; // Default 50% per hour
    }

    const rates = recentCharging.map(session => {
      const levelGain = session.endLevel! - session.startLevel;
      const duration = (session.end!.getTime() - session.start.getTime()) / (60 * 60 * 1000); // hours
      return levelGain / duration;
    });

    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }

  private getRecentUsageRate(): { hourly: number; dataPoints: number } {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentUsage = this.backgroundTaskUsage.filter(
      usage => usage.timestamp.getTime() > oneDayAgo
    );

    if (recentUsage.length === 0) {
      return { hourly: 5, dataPoints: 0 }; // Default 5% per hour
    }

    const totalUsage = recentUsage.reduce((sum, usage) => sum + usage.usage, 0);
    const hoursOfData = (now - Math.min(...recentUsage.map(u => u.timestamp.getTime()))) / (60 * 60 * 1000);

    const hourlyRate = hoursOfData > 0 ? totalUsage / hoursOfData : 5;

    return {
      hourly: Math.max(1, hourlyRate), // Minimum 1% per hour
      dataPoints: Math.floor(hoursOfData)
    };
  }

  private estimateOperationCost(operationType: string): number {
    // Estimate battery cost for different operations
    const baseCosts = {
      background_task: 0.1,    // 0.1%
      sync: 0.3,               // 0.3%
      reminder_delivery: 0.05,  // 0.05%
      ui_interaction: 0.02     // 0.02%
    };

    return baseCosts[operationType] || 0.1;
  }

  private updateDailyUsageStats(operationType: string, usage: number): void {
    const today = this.usageStats.today;

    switch (operationType) {
      case 'background_task':
        today.backgroundUsage += usage;
        break;
      case 'sync':
        today.syncOperations += usage;
        break;
      case 'reminder_delivery':
        today.reminderDelivery += usage;
        break;
      default:
        today.appUsage += usage;
    }

    // Update estimated remaining time
    const currentLevel = this.currentState.level * 100;
    const usageRate = this.getRecentUsageRate().hourly;
    today.estimatedRemaining = currentLevel / usageRate;
  }

  private updateUsagePatterns(): void {
    // Update weekly usage patterns
    const now = new Date();
    const hour = now.getHours();
    const hourStr = `${hour.toString().padStart(2, '0')}:00`;

    // Track peak usage hours
    if (!this.usageStats.weekly.peakUsageHours.includes(hourStr)) {
      // Check if current hour has high usage
      const currentHourUsage = this.backgroundTaskUsage
        .filter(usage => usage.timestamp.getHours() === hour)
        .reduce((sum, usage) => sum + usage.usage, 0);

      if (currentHourUsage > 1.0) { // More than 1% usage in an hour
        this.usageStats.weekly.peakUsageHours.push(hourStr);
        this.usageStats.weekly.peakUsageHours.sort();
      }
    }
  }

  private recordOptimizationChange(optimization: BatteryOptimization): void {
    const history = {
      timestamp: new Date(),
      optimization: { ...optimization },
      triggeredBy: `Battery level ${(this.currentState.level * 100).toFixed(1)}%`,
      duration: 0, // Will be updated when optimization changes again
      batterySaved: 0 // Will be calculated based on actual savings
    };

    // Update duration of previous optimization
    if (this.optimizationHistory.length > 0) {
      const previous = this.optimizationHistory[this.optimizationHistory.length - 1];
      previous.duration = Date.now() - previous.timestamp.getTime();
    }

    this.optimizationHistory.push(history);

    // Keep only last 100 optimization changes
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory = this.optimizationHistory.slice(-100);
    }
  }

  private async notifyOptimizationChange(optimization: BatteryOptimization): Promise<void> {
    try {
      // This could send notifications about optimization changes
      console.log(`Battery optimization changed to: ${optimization.level}`);

      if (optimization.isActive && optimization.level === 'aggressive') {
        // Could show a notification about aggressive power saving
        console.log('Aggressive battery optimization activated');
      }

    } catch (error) {
      console.error('Failed to notify optimization change:', error);
    }
  }

  // Storage methods
  private async loadConfiguration(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.CONFIG);
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('Failed to load battery optimizer configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save battery optimizer configuration:', error);
    }
  }

  private async loadUsageStats(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.USAGE_STATS);
      if (stored) {
        const stats = JSON.parse(stored);
        this.usageStats = { ...this.usageStats, ...stats };
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  }

  private async saveUsageStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.USAGE_STATS, JSON.stringify(this.usageStats));
    } catch (error) {
      console.error('Failed to save usage stats:', error);
    }
  }

  private async loadOptimizationHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.OPTIMIZATION_HISTORY);
      if (stored) {
        const history = JSON.parse(stored);
        this.optimizationHistory = history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load optimization history:', error);
    }
  }

  private async saveOptimizationHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.OPTIMIZATION_HISTORY, JSON.stringify(this.optimizationHistory));
    } catch (error) {
      console.error('Failed to save optimization history:', error);
    }
  }

  private async loadChargingPatterns(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.CHARGING_PATTERNS);
      if (stored) {
        const patterns = JSON.parse(stored);
        this.chargingPatterns = patterns.map((pattern: any) => ({
          ...pattern,
          start: new Date(pattern.start),
          end: pattern.end ? new Date(pattern.end) : undefined
        }));
      }
    } catch (error) {
      console.error('Failed to load charging patterns:', error);
    }
  }

  private async saveChargingPatterns(): Promise<void> {
    try {
      // Keep only last 50 charging sessions
      const trimmedPatterns = this.chargingPatterns.slice(-50);
      await AsyncStorage.setItem(this.STORAGE_KEYS.CHARGING_PATTERNS, JSON.stringify(trimmedPatterns));
    } catch (error) {
      console.error('Failed to save charging patterns:', error);
    }
  }

  private getDefaultConfig(): OptimizationConfig {
    return {
      thresholds: {
        lowBattery: 30,
        criticalBattery: 15,
        conservativeMode: 50,
        aggressiveMode: 10
      },
      adaptiveBehavior: {
        enabled: true,
        learningPeriodDays: 7,
        adaptToUserPatterns: true,
        respectChargingSchedule: true
      },
      restrictions: {
        backgroundProcessing: {
          lowBattery: 'reduce',
          criticalBattery: 'defer'
        },
        syncOperations: {
          lowBattery: 'wifi_only',
          criticalBattery: 'defer'
        },
        reminderDelivery: {
          lowBattery: 'batch',
          criticalBattery: 'critical_only'
        }
      },
      monitoring: {
        updateIntervalSeconds: 30,
        trackUsagePatterns: true,
        predictBatteryLife: true
      }
    };
  }

  private getDefaultBatteryState(): BatteryState {
    return {
      level: 0.5,
      state: 'unknown',
      isCharging: false,
      lowPowerMode: false
    };
  }

  private getDefaultOptimization(): BatteryOptimization {
    return {
      isActive: false,
      level: 'none',
      description: 'No optimization',
      restrictions: {
        backgroundProcessingReduced: false,
        syncFrequencyReduced: false,
        notificationsBatched: false,
        nonCriticalTasksDeferred: false,
        visualEffectsReduced: false
      },
      estimatedBatterySavings: 0
    };
  }

  private getDefaultUsageStats(): BatteryUsageStats {
    return {
      today: {
        appUsage: 0,
        backgroundUsage: 0,
        reminderDelivery: 0,
        syncOperations: 0,
        estimatedRemaining: 24
      },
      weekly: {
        averageDailyUsage: 0,
        peakUsageHours: [],
        backgroundPercentage: 0,
        trends: {
          increasing: false,
          stable: true,
          decreasing: false
        }
      },
      optimizationImpact: {
        batterySaved: 0,
        performanceImpact: 0,
        userSatisfaction: 1.0
      }
    };
  }

  // Public API methods
  async updateConfig(config: Partial<OptimizationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfiguration();
  }

  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  getOptimizationHistory(limit: number = 10): any[] {
    return this.optimizationHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async forceOptimizationLevel(level: 'none' | 'conservative' | 'moderate' | 'aggressive'): Promise<void> {
    // Temporarily override optimization level
    console.log(`Forcing optimization level to: ${level}`);
    // Implementation would temporarily set optimization level
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    this.stopBatteryMonitoring();
    await this.saveUsageStats();
    await this.saveOptimizationHistory();
    await this.saveChargingPatterns();
  }
}

export default BatteryOptimizer;