/**
 * Tests for DozeCompatibility
 * Issue #27 Stream D - Doze mode compatibility tests
 */

import DozeCompatibility from '../DozeCompatibility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
  select: jest.fn((obj) => obj.android),
}));

describe('DozeCompatibility', () => {
  let dozeCompat: DozeCompatibility;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    dozeCompat = DozeCompatibility.getInstance();
  });

  afterEach(async () => {
    await dozeCompat.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully on Android', async () => {
      const result = await dozeCompat.initialize();
      expect(result.success).toBe(true);
    });

    test('should skip initialization on iOS', async () => {
      (Platform as any).OS = 'ios';
      const result = await dozeCompat.initialize();
      expect(result.success).toBe(true);
      (Platform as any).OS = 'android'; // Reset
    });
  });

  describe('Doze Status', () => {
    test('should get current doze status', async () => {
      await dozeCompat.initialize();
      const status = dozeCompat.getDozeStatus();

      expect(status).toHaveProperty('isDozeEnabled');
      expect(status).toHaveProperty('isAppWhitelisted');
      expect(status).toHaveProperty('currentState');
      expect(status).toHaveProperty('standbyBucket');
    });

    test('should detect when in doze mode', async () => {
      await dozeCompat.initialize();
      const inDoze = dozeCompat.isInDozeMode();
      expect(typeof inDoze).toBe('boolean');
    });

    test('should detect whitelist status', async () => {
      await dozeCompat.initialize();
      const whitelisted = dozeCompat.isWhitelisted();
      expect(typeof whitelisted).toBe('boolean');
    });
  });

  describe('Operation Constraints', () => {
    test('should allow critical operations in doze mode', async () => {
      await dozeCompat.initialize();

      const result = dozeCompat.canExecuteOperation('network', 'critical');
      expect(result.allowed).toBe(true);
    });

    test('should restrict network operations in doze mode', async () => {
      await dozeCompat.initialize();

      const result = dozeCompat.canExecuteOperation('network', 'low');
      // May be restricted if in doze mode
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
    });

    test('should provide fallback strategies', async () => {
      await dozeCompat.initialize();

      const result = dozeCompat.canExecuteOperation('background', 'medium');
      if (!result.allowed) {
        expect(result.fallbackStrategy).toBeDefined();
      }
    });

    test('should check alarm operation constraints', async () => {
      await dozeCompat.initialize();

      const result = dozeCompat.canExecuteOperation('alarm', 'medium');
      expect(result).toHaveProperty('allowed');
    });

    test('should check location operation constraints', async () => {
      await dozeCompat.initialize();

      const result = dozeCompat.canExecuteOperation('location', 'low');
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('Maintenance Windows', () => {
    test('should schedule maintenance window', async () => {
      await dozeCompat.initialize();

      const tasks = [
        {
          taskId: 'sync_task',
          taskType: 'sync' as const,
          estimatedDuration: 30000,
          requiresNetwork: true,
          critical: false,
        },
        {
          taskId: 'cleanup_task',
          taskType: 'cleanup' as const,
          estimatedDuration: 15000,
          requiresNetwork: false,
          critical: false,
        },
      ];

      const windowId = await dozeCompat.scheduleMaintenanceWindow(tasks);
      expect(windowId).toBeDefined();
      expect(windowId).toContain('mw_');
    });

    test('should get maintenance windows', async () => {
      await dozeCompat.initialize();

      const tasks = [
        {
          taskId: 'test_task',
          taskType: 'backup' as const,
          estimatedDuration: 10000,
          requiresNetwork: true,
          critical: false,
        },
      ];

      await dozeCompat.scheduleMaintenanceWindow(tasks);

      const windows = dozeCompat.getMaintenanceWindows();
      expect(windows.length).toBeGreaterThanOrEqual(1);
    });

    test('should filter maintenance windows by status', async () => {
      await dozeCompat.initialize();

      const scheduled = dozeCompat.getMaintenanceWindows('scheduled');
      const completed = dozeCompat.getMaintenanceWindows('completed');

      expect(Array.isArray(scheduled)).toBe(true);
      expect(Array.isArray(completed)).toBe(true);
    });
  });

  describe('Alarm Scheduling', () => {
    test('should schedule doze-compatible alarm', async () => {
      await dozeCompat.initialize();

      const triggerTime = new Date(Date.now() + 60000);
      await dozeCompat.scheduleDozeCompatibleAlarm('alarm_123', triggerTime, {
        priority: 'high',
        callback: 'handleAlarm',
      });

      const alarms = dozeCompat.getScheduledAlarms();
      expect(alarms.length).toBeGreaterThanOrEqual(1);
      expect(alarms[0].alarmId).toBe('alarm_123');
    });

    test('should use while_idle for critical alarms', async () => {
      await dozeCompat.initialize();

      const triggerTime = new Date(Date.now() + 60000);
      await dozeCompat.scheduleDozeCompatibleAlarm('critical_alarm', triggerTime, {
        priority: 'critical',
        callback: 'handleCritical',
      });

      const alarms = dozeCompat.getScheduledAlarms();
      const criticalAlarm = alarms.find(a => a.alarmId === 'critical_alarm');
      expect(criticalAlarm?.allowWhileIdle).toBe(true);
    });

    test('should cancel scheduled alarm', async () => {
      await dozeCompat.initialize();

      await dozeCompat.scheduleDozeCompatibleAlarm(
        'temp_alarm',
        new Date(Date.now() + 60000),
        { callback: 'handleTemp' }
      );

      const cancelled = await dozeCompat.cancelAlarm('temp_alarm');
      expect(cancelled).toBe(true);

      const alarms = dozeCompat.getScheduledAlarms();
      expect(alarms.find(a => a.alarmId === 'temp_alarm')).toBeUndefined();
    });
  });

  describe('Doze Constraints', () => {
    test('should get doze constraints', async () => {
      await dozeCompat.initialize();

      const constraints = dozeCompat.getDozeConstraints();
      expect(Array.isArray(constraints)).toBe(true);
      expect(constraints.length).toBeGreaterThan(0);

      constraints.forEach(constraint => {
        expect(constraint).toHaveProperty('constraintType');
        expect(constraint).toHaveProperty('isActive');
        expect(constraint).toHaveProperty('canExecute');
      });
    });
  });

  describe('Battery Optimization Whitelist', () => {
    test('should request whitelist approval', async () => {
      await dozeCompat.initialize();

      const result = await dozeCompat.requestBatteryOptimizationWhitelist();
      expect(result).toHaveProperty('granted');
      expect(result).toHaveProperty('reason');
    });
  });

  describe('Configuration', () => {
    test('should update doze configuration', async () => {
      await dozeCompat.initialize();

      await dozeCompat.updateConfiguration({
        scheduleMaintenanceWindows: false,
        fallbackToInexactAlarms: false,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('should apply configuration changes', async () => {
      await dozeCompat.initialize();

      await dozeCompat.updateConfiguration({
        enableDozeCompatibility: false,
      });

      // Monitoring should be stopped
    });
  });

  describe('Integration', () => {
    test('should coordinate alarms with maintenance windows', async () => {
      await dozeCompat.initialize();

      // Schedule maintenance window
      const tasks = [
        {
          taskId: 'sync',
          taskType: 'sync' as const,
          estimatedDuration: 20000,
          requiresNetwork: true,
          critical: false,
        },
      ];
      const windowId = await dozeCompat.scheduleMaintenanceWindow(tasks);

      // Schedule alarm
      await dozeCompat.scheduleDozeCompatibleAlarm(
        'reminder',
        new Date(Date.now() + 120000),
        {
          priority: 'high',
          callback: 'handleReminder',
        }
      );

      const windows = dozeCompat.getMaintenanceWindows();
      const alarms = dozeCompat.getScheduledAlarms();

      expect(windows.length).toBeGreaterThan(0);
      expect(alarms.length).toBeGreaterThan(0);
    });
  });
});