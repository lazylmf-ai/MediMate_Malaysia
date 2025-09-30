/**
 * Test Helpers and Utilities
 *
 * Comprehensive test utilities for MediMate test suite
 */

import { Alert } from 'react-native';

/**
 * Mock API Response Builder
 */
export class MockApiResponseBuilder<T> {
  private data: T | null = null;
  private error: Error | null = null;
  private status: number = 200;
  private delay: number = 0;

  withData(data: T): this {
    this.data = data;
    return this;
  }

  withError(error: Error, status: number = 500): this {
    this.error = error;
    this.status = status;
    return this;
  }

  withDelay(ms: number): this {
    this.delay = ms;
    return this;
  }

  async build(): Promise<{ success: boolean; data?: T; error?: Error }> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.error) {
      return { success: false, error: this.error };
    }

    return { success: true, data: this.data as T };
  }
}

/**
 * Wait for async operations
 */
export const waitFor = async (
  callback: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
): Promise<void> => {
  const { timeout = 5000, interval = 50, timeoutMessage = 'Timeout waiting for condition' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await callback();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(timeoutMessage);
};

/**
 * Delay execution
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Mock Date utilities
 */
export class MockDateFactory {
  private currentDate: Date;

  constructor(initialDate: Date = new Date('2025-09-30T10:00:00Z')) {
    this.currentDate = initialDate;
  }

  now(): Date {
    return new Date(this.currentDate);
  }

  advance(ms: number): void {
    this.currentDate = new Date(this.currentDate.getTime() + ms);
  }

  advanceDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  advanceHours(hours: number): void {
    this.advance(hours * 60 * 60 * 1000);
  }

  reset(date: Date = new Date('2025-09-30T10:00:00Z')): void {
    this.currentDate = date;
  }
}

/**
 * Mock Alert
 */
export const mockAlert = () => {
  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    if (buttons && buttons.length > 0) {
      // Auto-call first button callback for tests
      const firstButton = buttons[0];
      if (firstButton.onPress) {
        firstButton.onPress();
      }
    }
  });
};

/**
 * Test Data Generators
 */
export class TestDataGenerator {
  static randomId(): string {
    return `test-${Math.random().toString(36).substr(2, 9)}`;
  }

  static randomEmail(): string {
    return `test-${this.randomId()}@example.com`;
  }

  static randomPhoneNumber(): string {
    return `+60${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
  }

  static randomDate(start: Date = new Date('2025-01-01'), end: Date = new Date()): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  static medicationRecord(overrides: any = {}) {
    return {
      id: this.randomId(),
      name: 'Test Medication',
      dosage: '500mg',
      frequency: 'twice_daily',
      startDate: new Date().toISOString(),
      patientId: this.randomId(),
      active: true,
      ...overrides,
    };
  }

  static adherenceRecord(overrides: any = {}) {
    return {
      id: this.randomId(),
      medicationId: this.randomId(),
      scheduledTime: new Date().toISOString(),
      takenTime: new Date().toISOString(),
      status: 'taken',
      method: 'manual',
      patientId: this.randomId(),
      ...overrides,
    };
  }

  static patientData(overrides: any = {}) {
    return {
      id: this.randomId(),
      name: 'Test Patient',
      email: this.randomEmail(),
      phone: this.randomPhoneNumber(),
      dateOfBirth: '1990-01-01',
      language: 'en',
      culturalBackground: 'malay',
      ...overrides,
    };
  }

  static prayerTimes(date: Date = new Date()) {
    return {
      date: date.toISOString().split('T')[0],
      fajr: '05:45',
      dhuhr: '13:15',
      asr: '16:45',
      maghrib: '19:15',
      isha: '20:30',
      location: {
        latitude: 3.139,
        longitude: 101.6869,
        city: 'Kuala Lumpur',
      },
    };
  }

  static familyMember(overrides: any = {}) {
    return {
      id: this.randomId(),
      name: 'Family Member',
      relationship: 'child',
      email: this.randomEmail(),
      phone: this.randomPhoneNumber(),
      accessLevel: 'view',
      notifications: true,
      ...overrides,
    };
  }
}

/**
 * Performance Test Utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime(fn: () => Promise<any>): Promise<number> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  }

  static async measureMemoryUsage(fn: () => Promise<any>): Promise<{ before: number; after: number; delta: number }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const before = (performance as any).memory?.usedJSHeapSize || 0;
    await fn();
    const after = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      before,
      after,
      delta: after - before,
    };
  }

  static async runBenchmark(
    name: string,
    fn: () => Promise<any>,
    iterations: number = 100
  ): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const time = await this.measureExecutionTime(fn);
      times.push(time);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
    };
  }
}

/**
 * Mock Storage
 */
export class MockStorage {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return keys.map(key => [key, this.storage.get(key) || null]);
  }

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    keyValuePairs.forEach(([key, value]) => {
      this.storage.set(key, value);
    });
  }

  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach(key => this.storage.delete(key));
  }
}

/**
 * Network Simulation
 */
export class NetworkSimulator {
  static async simulateLatency(min: number = 50, max: number = 200): Promise<void> {
    const latency = Math.random() * (max - min) + min;
    await delay(latency);
  }

  static async simulateSlowNetwork(): Promise<void> {
    await this.simulateLatency(1000, 3000);
  }

  static async simulateTimeout(timeout: number = 5000): Promise<never> {
    await delay(timeout);
    throw new Error('Network timeout');
  }

  static simulateNetworkError(): Error {
    return new Error('Network request failed');
  }

  static simulateOffline(): void {
    // Mock network state
    (global as any).navigator = {
      ...((global as any).navigator || {}),
      onLine: false,
    };
  }

  static simulateOnline(): void {
    (global as any).navigator = {
      ...((global as any).navigator || {}),
      onLine: true,
    };
  }
}

/**
 * Cultural Context Builder
 */
export class CulturalContextBuilder {
  private context: any = {};

  withLanguage(language: 'en' | 'ms' | 'zh' | 'ta'): this {
    this.context.language = language;
    return this;
  }

  withReligion(religion: 'islam' | 'buddhism' | 'hinduism' | 'christianity' | 'other'): this {
    this.context.religion = religion;
    return this;
  }

  withLocation(latitude: number, longitude: number, city?: string): this {
    this.context.location = { latitude, longitude, city };
    return this;
  }

  withPrayerTimes(times: any): this {
    this.context.prayerTimes = times;
    return this;
  }

  withFestival(festival: string, date: Date): this {
    this.context.upcomingFestival = { name: festival, date: date.toISOString() };
    return this;
  }

  build(): any {
    return { ...this.context };
  }
}

/**
 * Assert Helpers
 */
export const assertHelpers = {
  assertDateWithinRange(actual: Date, expected: Date, toleranceMs: number = 1000): void {
    const diff = Math.abs(actual.getTime() - expected.getTime());
    if (diff > toleranceMs) {
      throw new Error(
        `Date ${actual.toISOString()} is not within ${toleranceMs}ms of ${expected.toISOString()}`
      );
    }
  },

  assertArrayContainsObject(array: any[], predicate: (item: any) => boolean, message?: string): void {
    if (!array.some(predicate)) {
      throw new Error(message || 'Array does not contain expected object');
    }
  },

  assertPerformanceMetric(actualMs: number, expectedMaxMs: number, metricName: string): void {
    if (actualMs > expectedMaxMs) {
      throw new Error(
        `${metricName} performance: ${actualMs.toFixed(2)}ms exceeds maximum ${expectedMaxMs}ms`
      );
    }
  },

  assertMemoryUsage(usedMB: number, maxMB: number, description: string): void {
    if (usedMB > maxMB) {
      throw new Error(
        `${description} memory usage: ${usedMB.toFixed(2)}MB exceeds maximum ${maxMB}MB`
      );
    }
  },
};

/**
 * Cleanup utilities
 */
export const cleanup = {
  resetMocks(): void {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  },

  resetTimers(): void {
    jest.clearAllTimers();
    jest.useRealTimers();
  },

  resetNetwork(): void {
    NetworkSimulator.simulateOnline();
  },

  async resetAll(): Promise<void> {
    this.resetMocks();
    this.resetTimers();
    this.resetNetwork();
  },
};

/**
 * Export all utilities
 */
export default {
  MockApiResponseBuilder,
  waitFor,
  delay,
  MockDateFactory,
  mockAlert,
  TestDataGenerator,
  PerformanceTestUtils,
  MockStorage,
  NetworkSimulator,
  CulturalContextBuilder,
  assertHelpers,
  cleanup,
};