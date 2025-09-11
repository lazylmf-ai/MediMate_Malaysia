/**
 * Jest Test Setup for MediMate Malaysia Backend
 * Configures testing environment for Malaysian healthcare services
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../.env.test') });

// Mock console methods to reduce test noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only show errors in test environment
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: originalConsoleError // Keep errors visible for debugging
};

// Mock external API calls for consistent testing
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} }))
}));

// Set test timeout for healthcare services
jest.setTimeout(30000); // 30 seconds for comprehensive cultural service tests

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z');
global.Date = class extends Date {
  constructor(date?: string | number | Date) {
    if (date) {
      super(date);
    } else {
      super(mockDate);
    }
  }
} as any;

// Extend Jest matchers for cultural testing (removed custom matcher, using built-in toContain instead)

// Global test setup
beforeAll(() => {
  console.log('🧪 Setting up MediMate Malaysia healthcare test environment...');
});

afterAll(() => {
  console.log('🧪 Cleaning up MediMate Malaysia healthcare test environment...');
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

export {};