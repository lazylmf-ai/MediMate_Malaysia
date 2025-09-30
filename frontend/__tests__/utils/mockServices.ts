/**
 * Mock Service Implementations
 *
 * Comprehensive mocks for testing services without external dependencies
 */

import { TestDataGenerator } from './testHelpers';

/**
 * Mock API Client
 */
export class MockApiClient {
  private responses: Map<string, any> = new Map();
  private callHistory: Array<{ endpoint: string; options: any; timestamp: Date }> = [];

  mockResponse(endpoint: string, response: any): void {
    this.responses.set(endpoint, response);
  }

  mockResponseWithMatcher(matcher: (endpoint: string) => boolean, response: any): void {
    this.responses.set('__matcher__', { matcher, response });
  }

  async request<T>(endpoint: string, options: any = {}): Promise<{ success: boolean; data?: T; error?: Error }> {
    this.callHistory.push({
      endpoint,
      options,
      timestamp: new Date(),
    });

    // Check exact match first
    if (this.responses.has(endpoint)) {
      const response = this.responses.get(endpoint);
      if (response instanceof Error) {
        return { success: false, error: response };
      }
      return { success: true, data: response };
    }

    // Check matcher
    const matcherEntry = this.responses.get('__matcher__');
    if (matcherEntry && matcherEntry.matcher(endpoint)) {
      const response = matcherEntry.response;
      if (response instanceof Error) {
        return { success: false, error: response };
      }
      return { success: true, data: response };
    }

    // Default empty response
    return { success: true, data: {} as T };
  }

  getCallHistory(): Array<{ endpoint: string; options: any; timestamp: Date }> {
    return [...this.callHistory];
  }

  getCallCount(endpoint?: string): number {
    if (!endpoint) {
      return this.callHistory.length;
    }
    return this.callHistory.filter(call => call.endpoint === endpoint).length;
  }

  wasCalledWith(endpoint: string, options?: any): boolean {
    return this.callHistory.some(call => {
      if (call.endpoint !== endpoint) return false;
      if (!options) return true;
      return JSON.stringify(call.options) === JSON.stringify(options);
    });
  }

  reset(): void {
    this.responses.clear();
    this.callHistory = [];
  }
}

/**
 * Mock Secure Store
 */
export class MockSecureStore {
  private store: Map<string, string> = new Map();

  async getItemAsync(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async deleteItemAsync(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  getAll(): Map<string, string> {
    return new Map(this.store);
  }
}

/**
 * Mock Notification Service
 */
export class MockNotificationService {
  private scheduledNotifications: Array<{
    id: string;
    title: string;
    body: string;
    trigger: any;
    data: any;
  }> = [];

  private presentedNotifications: Array<{
    id: string;
    title: string;
    body: string;
    timestamp: Date;
  }> = [];

  async scheduleNotification(notification: {
    title: string;
    body: string;
    trigger: any;
    data?: any;
  }): Promise<string> {
    const id = TestDataGenerator.randomId();
    this.scheduledNotifications.push({ id, ...notification });
    return id;
  }

  async cancelScheduledNotification(id: string): Promise<void> {
    this.scheduledNotifications = this.scheduledNotifications.filter(n => n.id !== id);
  }

  async cancelAllScheduledNotifications(): Promise<void> {
    this.scheduledNotifications = [];
  }

  async getScheduledNotifications(): Promise<any[]> {
    return [...this.scheduledNotifications];
  }

  async presentNotification(notification: { title: string; body: string }): Promise<void> {
    this.presentedNotifications.push({
      id: TestDataGenerator.randomId(),
      ...notification,
      timestamp: new Date(),
    });
  }

  getPresentedNotifications(): any[] {
    return [...this.presentedNotifications];
  }

  getScheduledNotificationCount(): number {
    return this.scheduledNotifications.length;
  }

  reset(): void {
    this.scheduledNotifications = [];
    this.presentedNotifications = [];
  }
}

/**
 * Mock Location Service
 */
export class MockLocationService {
  private currentLocation = {
    latitude: 3.139,
    longitude: 101.6869,
    accuracy: 10,
    altitude: 50,
    heading: 0,
    speed: 0,
  };

  async getCurrentPosition(): Promise<any> {
    return {
      coords: { ...this.currentLocation },
      timestamp: Date.now(),
    };
  }

  async requestPermissions(): Promise<{ status: string }> {
    return { status: 'granted' };
  }

  setLocation(latitude: number, longitude: number): void {
    this.currentLocation.latitude = latitude;
    this.currentLocation.longitude = longitude;
  }

  reset(): void {
    this.currentLocation = {
      latitude: 3.139,
      longitude: 101.6869,
      accuracy: 10,
      altitude: 50,
      heading: 0,
      speed: 0,
    };
  }
}

/**
 * Mock Camera Service
 */
export class MockCameraService {
  private capturedImages: Array<{
    uri: string;
    width: number;
    height: number;
    timestamp: Date;
  }> = [];

  async requestPermissions(): Promise<{ status: string }> {
    return { status: 'granted' };
  }

  async capturePhoto(): Promise<{ uri: string; width: number; height: number }> {
    const image = {
      uri: `file:///mock/image_${Date.now()}.jpg`,
      width: 1920,
      height: 1080,
      timestamp: new Date(),
    };
    this.capturedImages.push(image);
    return image;
  }

  getCapturedImages(): any[] {
    return [...this.capturedImages];
  }

  reset(): void {
    this.capturedImages = [];
  }
}

/**
 * Mock OCR Service
 */
export class MockOCRService {
  private mockResults: Map<string, any> = new Map();

  mockResult(imageUri: string, result: any): void {
    this.mockResults.set(imageUri, result);
  }

  async recognizeText(imageUri: string): Promise<{
    text: string;
    blocks: any[];
    confidence: number;
  }> {
    if (this.mockResults.has(imageUri)) {
      return this.mockResults.get(imageUri);
    }

    // Default mock result
    return {
      text: 'Paracetamol 500mg',
      blocks: [
        {
          text: 'Paracetamol',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 200, height: 30 },
        },
        {
          text: '500mg',
          confidence: 0.92,
          boundingBox: { x: 10, y: 50, width: 100, height: 30 },
        },
      ],
      confidence: 0.935,
    };
  }

  reset(): void {
    this.mockResults.clear();
  }
}

/**
 * Mock Database
 */
export class MockDatabase {
  private tables: Map<string, Map<string, any>> = new Map();

  async executeSql(
    query: string,
    params: any[] = []
  ): Promise<{ rows: { _array: any[]; length: number } }> {
    // Simple mock implementation
    const rows: any[] = [];

    if (query.toLowerCase().includes('select')) {
      const tableName = this.extractTableName(query);
      const table = this.tables.get(tableName);
      if (table) {
        rows.push(...Array.from(table.values()));
      }
    }

    return {
      rows: {
        _array: rows,
        length: rows.length,
      },
    };
  }

  async insert(tableName: string, data: any): Promise<string> {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }

    const id = data.id || TestDataGenerator.randomId();
    const table = this.tables.get(tableName)!;
    table.set(id, { ...data, id });

    return id;
  }

  async update(tableName: string, id: string, data: any): Promise<void> {
    const table = this.tables.get(tableName);
    if (table && table.has(id)) {
      table.set(id, { ...table.get(id), ...data });
    }
  }

  async delete(tableName: string, id: string): Promise<void> {
    const table = this.tables.get(tableName);
    if (table) {
      table.delete(id);
    }
  }

  async getById(tableName: string, id: string): Promise<any | null> {
    const table = this.tables.get(tableName);
    return table?.get(id) || null;
  }

  async getAll(tableName: string): Promise<any[]> {
    const table = this.tables.get(tableName);
    return table ? Array.from(table.values()) : [];
  }

  private extractTableName(query: string): string {
    const match = query.match(/from\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  clear(): void {
    this.tables.clear();
  }

  clearTable(tableName: string): void {
    this.tables.delete(tableName);
  }
}

/**
 * Mock Encryption Service
 */
export class MockEncryptionService {
  async encrypt(data: string, key: string): Promise<string> {
    // Simple mock: base64 encode
    return Buffer.from(`encrypted:${data}:${key}`).toString('base64');
  }

  async decrypt(encryptedData: string, key: string): Promise<string> {
    // Simple mock: base64 decode
    const decoded = Buffer.from(encryptedData, 'base64').toString();
    const match = decoded.match(/^encrypted:(.+):(.+)$/);
    if (!match) {
      throw new Error('Invalid encrypted data');
    }
    return match[1];
  }

  async generateKey(): Promise<string> {
    return TestDataGenerator.randomId();
  }

  async hash(data: string): Promise<string> {
    return Buffer.from(data).toString('base64');
  }
}

/**
 * Mock Analytics Service
 */
export class MockAnalyticsService {
  private events: Array<{
    name: string;
    properties: any;
    timestamp: Date;
  }> = [];

  trackEvent(name: string, properties: any = {}): void {
    this.events.push({
      name,
      properties,
      timestamp: new Date(),
    });
  }

  trackScreen(screenName: string, properties: any = {}): void {
    this.trackEvent('screen_view', { screen_name: screenName, ...properties });
  }

  getEvents(): any[] {
    return [...this.events];
  }

  getEventsByName(name: string): any[] {
    return this.events.filter(e => e.name === name);
  }

  getEventCount(name?: string): number {
    if (!name) return this.events.length;
    return this.getEventsByName(name).length;
  }

  reset(): void {
    this.events = [];
  }
}

/**
 * Mock Prayer Time Service
 */
export class MockPrayerTimeService {
  async getPrayerTimes(date: Date, latitude: number, longitude: number): Promise<any> {
    return TestDataGenerator.prayerTimes(date);
  }

  async getQiblaDirection(latitude: number, longitude: number): Promise<number> {
    // Kuala Lumpur to Mecca
    return 292.5;
  }
}

/**
 * Export all mocks
 */
export default {
  MockApiClient,
  MockSecureStore,
  MockNotificationService,
  MockLocationService,
  MockCameraService,
  MockOCRService,
  MockDatabase,
  MockEncryptionService,
  MockAnalyticsService,
  MockPrayerTimeService,
};