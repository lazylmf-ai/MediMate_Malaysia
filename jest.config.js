/**
 * Jest Configuration for MediMate Malaysia
 * Healthcare-focused testing with Malaysian cultural test helpers
 * PDPA compliance testing and security validation
 */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  // Project configuration
  displayName: 'MediMate Malaysia Healthcare Tests',
  testEnvironment: 'node',
  preset: 'ts-jest',
  
  // Root directories
  rootDir: '.',
  roots: ['<rootDir>/backend/src', '<rootDir>/mobile/src', '<rootDir>/tests'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          // Healthcare-specific TypeScript settings for tests
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    ],
    '^.+\\.(js|jsx)$': 'babel-jest',
    // Handle cultural assets in tests
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/tests/helpers/file-mock.js',
    '\\.(css|less|scss)$': '<rootDir>/tests/helpers/style-mock.js'
  },
  
  // Module name mapping for Malaysian healthcare modules
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/' }),
    
    // Healthcare module aliases
    '^@cultural/(.*)$': '<rootDir>/src/services/cultural/$1',
    '^@healthcare/(.*)$': '<rootDir>/src/services/healthcare/$1',
    '^@pdpa/(.*)$': '<rootDir>/src/middleware/pdpa/$1',
    '^@security/(.*)$': '<rootDir>/src/middleware/security/$1',
    
    // Mobile aliases
    '^@mobile/(.*)$': '<rootDir>/mobile/src/$1',
    
    // Test helpers
    '^@test-helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^@cultural-helpers/(.*)$': '<rootDir>/tests/helpers/cultural/$1',
    '^@healthcare-helpers/(.*)$': '<rootDir>/tests/helpers/healthcare/$1',
    
    // Mock Malaysian healthcare APIs
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1'
  },
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
    // Malaysian cultural test patterns
    '**/cultural/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/healthcare/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/pdpa/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    // Don't test generated cultural data
    '<rootDir>/src/assets/cultural/generated/',
    // Don't test patient data (privacy)
    '<rootDir>/tests/fixtures/patient-data/'
  ],
  
  // Coverage configuration for healthcare compliance
  collectCoverage: true,
  collectCoverageFrom: [
    'backend/src/**/*.{ts,tsx,js,jsx}',
    'mobile/src/**/*.{ts,tsx,js,jsx}',
    'src/**/*.{ts,tsx,js,jsx}',
    // Include Malaysian healthcare modules
    'src/services/cultural/**/*.{ts,tsx}',
    'src/services/healthcare/**/*.{ts,tsx}',
    'src/middleware/pdpa/**/*.{ts,tsx}',
    'src/middleware/security/**/*.{ts,tsx}',
    
    // Exclude from coverage
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.*',
    '!**/*.mock.*',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/fixtures/**',
    // Don't measure coverage for generated cultural data
    '!**/generated/**',
    // Don't measure test helpers
    '!**/test-helpers/**'
  ],
  
  // Coverage thresholds for healthcare compliance (90%+ required)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Stricter requirements for healthcare modules
    'src/services/healthcare/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/middleware/security/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/middleware/pdpa/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Cultural modules can be slightly more lenient
    'src/services/cultural/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'clover'],
  coverageDirectory: '<rootDir>/coverage',
  
  // Setup files for Malaysian healthcare context
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/global.ts',
    '<rootDir>/tests/setup/healthcare.ts',
    '<rootDir>/tests/setup/cultural.ts',
    '<rootDir>/tests/setup/pdpa-compliance.ts'
  ],
  
  // Global setup for healthcare testing environment
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
  
  // Test timeout for healthcare operations (longer for compliance checks)
  testTimeout: 30000, // 30 seconds
  
  // Verbose output for healthcare testing
  verbose: true,
  
  // Clear mocks between tests (important for healthcare data integrity)
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Keep Malaysian cultural data mocks
  
  // Error on deprecated features (healthcare code quality)
  errorOnDeprecated: true,
  
  // Detect open handles (important for healthcare database connections)
  detectOpenHandles: true,
  forceExit: false, // Let healthcare connections close gracefully
  
  // Malaysian healthcare test environment variables
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
  
  // Test result processor for healthcare reporting
  testResultsProcessor: '<rootDir>/tests/processors/healthcare-results.js',
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Projects configuration for multi-package testing
  projects: [
    // Backend healthcare API tests
    {
      displayName: 'Backend Healthcare API',
      testMatch: ['<rootDir>/backend/**/*.(test|spec).(ts|tsx|js|jsx)'],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/backend.ts',
        '<rootDir>/tests/setup/database.ts'
      ]
    },
    
    // Mobile healthcare app tests
    {
      displayName: 'Mobile Healthcare App',
      testMatch: ['<rootDir>/mobile/**/*.(test|spec).(ts|tsx|js|jsx)'],
      preset: 'react-native',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/react-native.ts',
        '<rootDir>/tests/setup/cultural-mobile.ts'
      ],
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|react-native-vector-icons|react-native-calendars)/)'
      ]
    },
    
    // Malaysian cultural intelligence tests
    {
      displayName: 'Malaysian Cultural Intelligence',
      testMatch: [
        '<rootDir>/src/services/cultural/**/*.(test|spec).(ts|tsx)',
        '<rootDir>/tests/cultural/**/*.(test|spec).(ts|tsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/cultural.ts',
        '<rootDir>/tests/setup/prayer-times.ts',
        '<rootDir>/tests/setup/holidays.ts'
      ]
    },
    
    // Healthcare security and PDPA compliance tests
    {
      displayName: 'Healthcare Security & PDPA',
      testMatch: [
        '<rootDir>/src/middleware/security/**/*.(test|spec).(ts|tsx)',
        '<rootDir>/src/middleware/pdpa/**/*.(test|spec).(ts|tsx)',
        '<rootDir>/tests/security/**/*.(test|spec).(ts|tsx)',
        '<rootDir>/tests/pdpa/**/*.(test|spec).(ts|tsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/security.ts',
        '<rootDir>/tests/setup/pdpa-compliance.ts'
      ]
    },
    
    // Integration tests for Malaysian healthcare workflows
    {
      displayName: 'Malaysian Healthcare Integration',
      testMatch: ['<rootDir>/tests/integration/**/*.(test|spec).(ts|tsx|js|jsx)'],
      testTimeout: 60000, // 60 seconds for integration tests
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/integration.ts',
        '<rootDir>/tests/setup/database.ts',
        '<rootDir>/tests/setup/cultural.ts'
      ]
    }
  ],
  
  // Malaysian healthcare testing globals
  globals: {
    'ts-jest': {
      useESM: false
    },
    __MALAYSIAN_TEST_ENVIRONMENT__: true,
    __HEALTHCARE_COMPLIANCE_MODE__: 'test',
    __CULTURAL_DATA_MOCK__: true,
    __PDPA_VALIDATION_STRICT__: true
  },
  
  // Snapshot serializers for Malaysian healthcare data
  snapshotSerializers: [
    '<rootDir>/tests/serializers/healthcare-data.js',
    '<rootDir>/tests/serializers/cultural-data.js',
    '<rootDir>/tests/serializers/prayer-times.js'
  ],
  
  // Custom matchers for Malaysian healthcare testing
  setupFilesAfterEnv: [
    '<rootDir>/tests/matchers/healthcare.ts',
    '<rootDir>/tests/matchers/cultural.ts',
    '<rootDir>/tests/matchers/pdpa-compliance.ts'
  ],
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Bail configuration (stop on first failure for critical healthcare tests)
  bail: false, // Continue running tests to get full picture
  
  // Maximum worker processes (healthcare tests can be resource intensive)
  maxWorkers: '50%',
  
  // Test sequencer for Malaysian healthcare tests
  testSequencer: '<rootDir>/tests/sequencer/healthcare-sequencer.js'
};