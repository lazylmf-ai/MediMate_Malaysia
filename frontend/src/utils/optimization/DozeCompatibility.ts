/**
 * Doze Compatibility Handler
 *
 * Issue #27 Stream D - Battery & Storage Optimization
 *
 * Android Doze mode and App Standby compatibility:
 * - Doze mode detection and handling
 * - App Standby bucket management
 * - High-priority notification support
 * - Maintenance window scheduling
 * - Background restriction management
 * - Alarm scheduling compatibility
 *
 * Ensures critical features work even under aggressive battery optimization
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DozeStatus {
  isDozeEnabled: boolean;
  isAppWhitelisted: boolean;
  isIgnoringBatteryOptimizations: boolean;
  currentState: 'active' | 'idle' | 'idle_pending' | 'sensing' | 'locating';
  standbyBucket: 'active' | 'working_set' | 'frequent' | 'rare' | 'restricted' | 'unknown';
  lastDozeEntry?: Date;
  lastDozeExit?: Date;
  dozeSessionCount: number;
}

export interface MaintenanceWindow {
  windowId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tasks: MaintenanceTask[];
  status: 'scheduled' | 'executing' | 'completed' | 'failed';
}

export interface MaintenanceTask {
  taskId: string;
  taskType: 'sync' | 'backup' | 'cleanup' | 'update' | 'analytics';
  estimatedDuration: number; // milliseconds
  requiresNetwork: boolean;
  critical: boolean;
  executed: boolean;
  result?: 'success' | 'failure';
}

export interface DozeConstraint {
  constraintType: 'network' | 'charging' | 'idle' | 'storage' | 'timing';
  isActive: boolean;
  canExecute: boolean;
  reason?: string;
}

export interface AlarmSchedule {
  alarmId: string;
  triggerTime: Date;
  type: 'exact' | 'inexact' | 'repeating' | 'while_idle';
  allowWhileIdle: boolean;
  wakeup: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  callback: string; // Function name to call
}

export interface DozeConfig {
  enableDozeCompatibility: boolean;
  requestWhitelist: boolean;
  useHighPriorityNotifications: boolean;
  scheduleMaintenanceWindows: boolean;
  maintenanceWindowInterval: number; // hours
  respectDozeMode: boolean;
  fallbackToInexactAlarms: boolean;
}

class DozeCompatibility {
  private static instance: DozeCompatibility;

  private dozeStatus: DozeStatus;
  private config: DozeConfig;
  private maintenanceWindows: Map<string, MaintenanceWindow> = new Map();
  private scheduledAlarms: Map<string, AlarmSchedule> = new Map();

  private dozeMonitorInterval?: NodeJS.Timeout;

  private readonly STORAGE_KEYS = {
    DOZE_STATUS: 'doze_status',
    DOZE_CONFIG: 'doze_config',
    MAINTENANCE_WINDOWS: 'maintenance_windows',
    SCHEDULED_ALARMS: 'scheduled_alarms',
  };

  private constructor() {
    this.dozeStatus = {
      isDozeEnabled: false,
      isAppWhitelisted: false,
      isIgnoringBatteryOptimizations: false,
      currentState: 'active',
      standbyBucket: 'unknown',
      dozeSessionCount: 0,
    };

    this.config = {
      enableDozeCompatibility: true,
      requestWhitelist: false, // Don't request by default
      useHighPriorityNotifications: true,
      scheduleMaintenanceWindows: true,
      maintenanceWindowInterval: 6, // Every 6 hours
      respectDozeMode: true,
      fallbackToInexactAlarms: true,
    };
  }

  static getInstance(): DozeCompatibility {
    if (!DozeCompatibility.instance) {
      DozeCompatibility.instance = new DozeCompatibility();
    }
    return DozeCompatibility.instance;
  }

  /**
   * Initialize Doze Compatibility
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Doze Compatibility...');

      // Only initialize on Android
      if (Platform.OS !== 'android') {
        console.log('Doze mode is Android-only, skipping initialization');
        return { success: true };
      }

      // Load configuration and state
      await this.loadConfiguration();
      await this.loadDozeStatus();
      await this.loadMaintenanceWindows();
      await this.loadScheduledAlarms();

      // Check Doze status
      await this.updateDozeStatus();

      // Start monitoring if enabled
      if (this.config.enableDozeCompatibility) {
        this.startDozeMonitoring();
      }

      // Schedule maintenance windows
      if (this.config.scheduleMaintenanceWindows) {
        await this.scheduleNextMaintenanceWindow();
      }

      console.log('Doze Compatibility initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Doze Compatibility initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      };
    }
  }

  /**
   * Check if currently in Doze mode
   */
  isInDozeMode(): boolean {
    return (
      this.dozeStatus.currentState === 'idle' ||
      this.dozeStatus.currentState === 'idle_pending'
    );
  }

  /**
   * Check if app is whitelisted from battery optimizations
   */
  isWhitelisted(): boolean {
    return (
      this.dozeStatus.isAppWhitelisted || this.dozeStatus.isIgnoringBatteryOptimizations
    );
  }

  /**
   * Get current Doze status
   */
  getDozeStatus(): DozeStatus {
    return { ...this.dozeStatus };
  }

  /**
   * Check if operation can execute under current Doze constraints
   */
  canExecuteOperation(
    operationType: 'network' | 'background' | 'alarm' | 'location',
    priority: 'critical' | 'high' | 'medium' | 'low'
  ): {
    allowed: boolean;
    reason?: string;
    fallbackStrategy?: string;
  } {
    // Always allow critical operations
    if (priority === 'critical') {
      return { allowed: true };
    }

    // If not in Doze mode, allow everything
    if (!this.isInDozeMode()) {
      return { allowed: true };
    }

    // If whitelisted, allow most operations
    if (this.isWhitelisted()) {
      return { allowed: true };
    }

    // Check operation-specific constraints
    switch (operationType) {
      case 'network':
        return {
          allowed: false,
          reason: 'Network access restricted in Doze mode',
          fallbackStrategy: 'Queue for next maintenance window',
        };

      case 'background':
        return {
          allowed: false,
          reason: 'Background processing restricted in Doze mode',
          fallbackStrategy: 'Schedule for maintenance window',
        };

      case 'alarm':
        if (this.config.fallbackToInexactAlarms) {
          return {
            allowed: true,
            reason: 'Using inexact alarm to comply with Doze mode',
            fallbackStrategy: 'Alarm may be deferred up to 15 minutes',
          };
        }
        return {
          allowed: false,
          reason: 'Exact alarms not allowed in Doze mode',
          fallbackStrategy: 'Use setAlarmClock or setExactAndAllowWhileIdle',
        };

      case 'location':
        return {
          allowed: false,
          reason: 'Location updates limited in Doze mode',
          fallbackStrategy: 'Use coarse location or defer to active state',
        };

      default:
        return { allowed: false, reason: 'Unknown operation type' };
    }
  }

  /**
   * Schedule maintenance window
   */
  async scheduleMaintenanceWindow(
    tasks: Omit<MaintenanceTask, 'executed' | 'result'>[],
    priority: MaintenanceWindow['priority'] = 'medium',
    hoursFromNow: number = this.config.maintenanceWindowInterval
  ): Promise<string> {
    const windowId = `mw_${Date.now()}`;
    const startTime = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    const totalDuration = tasks.reduce((sum, task) => sum + task.estimatedDuration, 0);
    const endTime = new Date(startTime.getTime() + totalDuration);

    const maintenanceTasks: MaintenanceTask[] = tasks.map(task => ({
      ...task,
      executed: false,
    }));

    const window: MaintenanceWindow = {
      windowId,
      startTime,
      endTime,
      durationMinutes: totalDuration / (1000 * 60),
      priority,
      tasks: maintenanceTasks,
      status: 'scheduled',
    };

    this.maintenanceWindows.set(windowId, window);
    await this.saveMaintenanceWindows();

    console.log(
      `Scheduled maintenance window: ${windowId} at ${startTime.toISOString()} (${tasks.length} tasks)`
    );

    return windowId;
  }

  /**
   * Schedule alarm that respects Doze mode
   */
  async scheduleDozeCompatibleAlarm(
    alarmId: string,
    triggerTime: Date,
    options: {
      type?: AlarmSchedule['type'];
      priority?: AlarmSchedule['priority'];
      wakeup?: boolean;
      callback: string;
    }
  ): Promise<void> {
    const alarm: AlarmSchedule = {
      alarmId,
      triggerTime,
      type: options.type || 'inexact',
      allowWhileIdle: options.priority === 'critical',
      wakeup: options.wakeup || false,
      priority: options.priority || 'medium',
      callback: options.callback,
    };

    // Adjust alarm type based on Doze compatibility
    if (this.isInDozeMode() && !this.isWhitelisted()) {
      if (alarm.priority === 'critical') {
        // Use setExactAndAllowWhileIdle for critical alarms
        alarm.type = 'while_idle';
        alarm.allowWhileIdle = true;
      } else if (this.config.fallbackToInexactAlarms) {
        // Use inexact alarm
        alarm.type = 'inexact';
      }
    }

    this.scheduledAlarms.set(alarmId, alarm);
    await this.saveScheduledAlarms();

    console.log(
      `Scheduled Doze-compatible alarm: ${alarmId} (${alarm.type}) at ${triggerTime.toISOString()}`
    );
  }

  /**
   * Cancel scheduled alarm
   */
  async cancelAlarm(alarmId: string): Promise<boolean> {
    const deleted = this.scheduledAlarms.delete(alarmId);
    if (deleted) {
      await this.saveScheduledAlarms();
      console.log(`Cancelled alarm: ${alarmId}`);
    }
    return deleted;
  }

  /**
   * Get maintenance windows
   */
  getMaintenanceWindows(status?: MaintenanceWindow['status']): MaintenanceWindow[] {
    const windows = Array.from(this.maintenanceWindows.values());
    if (status) {
      return windows.filter(w => w.status === status);
    }
    return windows;
  }

  /**
   * Get scheduled alarms
   */
  getScheduledAlarms(): AlarmSchedule[] {
    return Array.from(this.scheduledAlarms.values());
  }

  /**
   * Request battery optimization whitelist (user must approve)
   */
  async requestBatteryOptimizationWhitelist(): Promise<{
    granted: boolean;
    reason?: string;
  }> {
    if (Platform.OS !== 'android') {
      return { granted: false, reason: 'Only available on Android' };
    }

    // This would integrate with native Android API
    // For now, return simulated result
    console.log('Requesting battery optimization whitelist (requires user approval)');

    return {
      granted: false,
      reason: 'User approval required - would show system dialog',
    };
  }

  /**
   * Get Doze constraints status
   */
  getDozeConstraints(): DozeConstraint[] {
    const constraints: DozeConstraint[] = [];

    if (this.isInDozeMode()) {
      constraints.push({
        constraintType: 'network',
        isActive: true,
        canExecute: this.isWhitelisted(),
        reason: this.isWhitelisted()
          ? 'App is whitelisted'
          : 'Network access deferred until maintenance window',
      });

      constraints.push({
        constraintType: 'idle',
        isActive: true,
        canExecute: false,
        reason: 'Device is idle, background processing limited',
      });

      constraints.push({
        constraintType: 'timing',
        isActive: true,
        canExecute: this.config.fallbackToInexactAlarms,
        reason: this.config.fallbackToInexactAlarms
          ? 'Using inexact alarms'
          : 'Exact timing not available',
      });
    } else {
      constraints.push({
        constraintType: 'network',
        isActive: false,
        canExecute: true,
      });

      constraints.push({
        constraintType: 'idle',
        isActive: false,
        canExecute: true,
      });

      constraints.push({
        constraintType: 'timing',
        isActive: false,
        canExecute: true,
      });
    }

    return constraints;
  }

  /**
   * Update configuration
   */
  async updateConfiguration(config: Partial<DozeConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await AsyncStorage.setItem(this.STORAGE_KEYS.DOZE_CONFIG, JSON.stringify(this.config));

    // Apply configuration changes
    if (config.enableDozeCompatibility !== undefined) {
      if (config.enableDozeCompatibility) {
        this.startDozeMonitoring();
      } else {
        this.stopDozeMonitoring();
      }
    }
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    try {
      this.stopDozeMonitoring();
      await this.saveDozeStatus();
      await this.saveMaintenanceWindows();
      await this.saveScheduledAlarms();
      console.log('Doze Compatibility shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Private helper methods
   */

  private async updateDozeStatus(): Promise<void> {
    // This would integrate with native Android API to get actual Doze status
    // For now, simulate status updates

    // Simplified Doze detection (would use PowerManager.isDeviceIdleMode())
    const isLikelyIdle = false; // Would check actual device state

    if (isLikelyIdle && !this.isInDozeMode()) {
      // Entering Doze mode
      this.dozeStatus.currentState = 'idle';
      this.dozeStatus.lastDozeEntry = new Date();
      this.dozeStatus.dozeSessionCount++;
      console.log('Entering Doze mode');
    } else if (!isLikelyIdle && this.isInDozeMode()) {
      // Exiting Doze mode
      this.dozeStatus.currentState = 'active';
      this.dozeStatus.lastDozeExit = new Date();
      console.log('Exiting Doze mode');

      // Execute pending maintenance windows
      await this.executePendingMaintenanceWindows();
    }

    await this.saveDozeStatus();
  }

  private startDozeMonitoring(): void {
    if (this.dozeMonitorInterval) {
      clearInterval(this.dozeMonitorInterval);
    }

    this.dozeMonitorInterval = setInterval(async () => {
      await this.updateDozeStatus();
      await this.checkMaintenanceWindows();
    }, 60 * 1000); // Every minute

    console.log('Doze monitoring started');
  }

  private stopDozeMonitoring(): void {
    if (this.dozeMonitorInterval) {
      clearInterval(this.dozeMonitorInterval);
      this.dozeMonitorInterval = undefined;
      console.log('Doze monitoring stopped');
    }
  }

  private async scheduleNextMaintenanceWindow(): Promise<void> {
    // Schedule default maintenance tasks
    const tasks: Omit<MaintenanceTask, 'executed' | 'result'>[] = [
      {
        taskId: 'sync_data',
        taskType: 'sync',
        estimatedDuration: 30000, // 30 seconds
        requiresNetwork: true,
        critical: false,
      },
      {
        taskId: 'cleanup_cache',
        taskType: 'cleanup',
        estimatedDuration: 15000, // 15 seconds
        requiresNetwork: false,
        critical: false,
      },
      {
        taskId: 'update_analytics',
        taskType: 'analytics',
        estimatedDuration: 10000, // 10 seconds
        requiresNetwork: true,
        critical: false,
      },
    ];

    await this.scheduleMaintenanceWindow(tasks, 'medium');
  }

  private async checkMaintenanceWindows(): Promise<void> {
    const now = Date.now();

    for (const window of this.maintenanceWindows.values()) {
      if (
        window.status === 'scheduled' &&
        window.startTime.getTime() <= now &&
        window.endTime.getTime() >= now
      ) {
        await this.executeMaintenanceWindow(window);
      }
    }
  }

  private async executeMaintenanceWindow(window: MaintenanceWindow): Promise<void> {
    console.log(`Executing maintenance window: ${window.windowId}`);

    window.status = 'executing';
    this.maintenanceWindows.set(window.windowId, window);

    try {
      for (const task of window.tasks) {
        if (!task.executed) {
          console.log(`  Executing task: ${task.taskId} (${task.taskType})`);

          // Simulate task execution
          await new Promise(resolve => setTimeout(resolve, task.estimatedDuration));

          task.executed = true;
          task.result = 'success';
        }
      }

      window.status = 'completed';
      console.log(`Maintenance window completed: ${window.windowId}`);
    } catch (error) {
      window.status = 'failed';
      console.error(`Maintenance window failed: ${window.windowId}`, error);
    }

    this.maintenanceWindows.set(window.windowId, window);
    await this.saveMaintenanceWindows();

    // Schedule next maintenance window
    if (this.config.scheduleMaintenanceWindows) {
      await this.scheduleNextMaintenanceWindow();
    }
  }

  private async executePendingMaintenanceWindows(): Promise<void> {
    const pendingWindows = this.getMaintenanceWindows('scheduled');

    for (const window of pendingWindows) {
      await this.executeMaintenanceWindow(window);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.STORAGE_KEYS.DOZE_CONFIG);
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load Doze configuration:', error);
    }
  }

  private async loadDozeStatus(): Promise<void> {
    try {
      const statusData = await AsyncStorage.getItem(this.STORAGE_KEYS.DOZE_STATUS);
      if (statusData) {
        this.dozeStatus = { ...this.dozeStatus, ...JSON.parse(statusData) };
      }
    } catch (error) {
      console.error('Failed to load Doze status:', error);
    }
  }

  private async loadMaintenanceWindows(): Promise<void> {
    try {
      const windowsData = await AsyncStorage.getItem(this.STORAGE_KEYS.MAINTENANCE_WINDOWS);
      if (windowsData) {
        const windows: MaintenanceWindow[] = JSON.parse(windowsData);
        for (const window of windows) {
          this.maintenanceWindows.set(window.windowId, window);
        }
      }
    } catch (error) {
      console.error('Failed to load maintenance windows:', error);
    }
  }

  private async loadScheduledAlarms(): Promise<void> {
    try {
      const alarmsData = await AsyncStorage.getItem(this.STORAGE_KEYS.SCHEDULED_ALARMS);
      if (alarmsData) {
        const alarms: AlarmSchedule[] = JSON.parse(alarmsData);
        for (const alarm of alarms) {
          this.scheduledAlarms.set(alarm.alarmId, alarm);
        }
      }
    } catch (error) {
      console.error('Failed to load scheduled alarms:', error);
    }
  }

  private async saveDozeStatus(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.DOZE_STATUS,
        JSON.stringify(this.dozeStatus)
      );
    } catch (error) {
      console.error('Failed to save Doze status:', error);
    }
  }

  private async saveMaintenanceWindows(): Promise<void> {
    try {
      const windows = Array.from(this.maintenanceWindows.values());
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.MAINTENANCE_WINDOWS,
        JSON.stringify(windows)
      );
    } catch (error) {
      console.error('Failed to save maintenance windows:', error);
    }
  }

  private async saveScheduledAlarms(): Promise<void> {
    try {
      const alarms = Array.from(this.scheduledAlarms.values());
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SCHEDULED_ALARMS,
        JSON.stringify(alarms)
      );
    } catch (error) {
      console.error('Failed to save scheduled alarms:', error);
    }
  }
}

export default DozeCompatibility;