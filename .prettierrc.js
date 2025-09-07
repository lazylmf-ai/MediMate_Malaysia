/**
 * Prettier Configuration for MediMate Malaysia
 * Healthcare-focused formatting with Malaysian cultural considerations
 * Ensures consistent code style across TypeScript, JavaScript, JSON, Markdown
 */

module.exports = {
  // Basic formatting rules
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  
  // Healthcare documentation formatting
  proseWrap: 'preserve', // Important for healthcare documentation
  
  // File-specific overrides for Malaysian healthcare context
  overrides: [
    // TypeScript/JavaScript files
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      options: {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'es5',
        bracketSpacing: true,
        // Healthcare code often has longer descriptive names
        printWidth: 120
      }
    },
    
    // JSON files (including cultural data)
    {
      files: ['*.json', '*.jsonc'],
      options: {
        printWidth: 80,
        tabWidth: 2,
        // Maintain readability for cultural data files
        trailingComma: 'none',
        // Keep cultural data properly indented
        bracketSpacing: true
      }
    },
    
    // Malaysian cultural translation files
    {
      files: [
        'src/i18n/**/*.json',
        'mobile/src/i18n/**/*.json',
        '**/locales/**/*.json',
        '**/cultural/**/*.json'
      ],
      options: {
        printWidth: 60, // Shorter for readability
        tabWidth: 2,
        trailingComma: 'none',
        // Preserve Malaysian text formatting
        bracketSpacing: true
      }
    },
    
    // Markdown files (healthcare documentation)
    {
      files: ['*.md', '*.mdx'],
      options: {
        printWidth: 80,
        proseWrap: 'preserve', // Important for healthcare documentation
        tabWidth: 2,
        // Maintain healthcare documentation structure
        bracketSpacing: true,
        singleQuote: false // Use double quotes in markdown for better readability
      }
    },
    
    // Healthcare configuration files
    {
      files: [
        'tsconfig*.json',
        'jest.config.*',
        '.eslintrc.*',
        'nodemon.json',
        'metro.config.js'
      ],
      options: {
        printWidth: 100,
        tabWidth: 2,
        trailingComma: 'es5'
      }
    },
    
    // Package.json files
    {
      files: ['package.json', 'package-lock.json'],
      options: {
        printWidth: 80,
        tabWidth: 2,
        trailingComma: 'none'
      }
    },
    
    // SQL files (healthcare database)
    {
      files: ['*.sql'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        // SQL formatting for healthcare schemas
        bracketSpacing: true,
        // Preserve healthcare data structure
        proseWrap: 'preserve'
      }
    },
    
    // YAML files (deployment, CI/CD)
    {
      files: ['*.yml', '*.yaml'],
      options: {
        printWidth: 100,
        tabWidth: 2,
        bracketSpacing: true,
        singleQuote: true
      }
    },
    
    // React Native specific files
    {
      files: ['mobile/src/**/*.{ts,tsx,js,jsx}'],
      options: {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'es5',
        // React Native often has longer component names
        bracketSpacing: true,
        bracketSameLine: false,
        // Preserve JSX readability for healthcare UI
        jsxSingleQuote: true
      }
    },
    
    // Backend API files
    {
      files: ['backend/src/**/*.{ts,js}'],
      options: {
        printWidth: 120, // Backend code can be wider
        singleQuote: true,
        trailingComma: 'es5',
        bracketSpacing: true,
        // Healthcare API endpoints have descriptive names
        arrowParens: 'always'
      }
    },
    
    // Test files
    {
      files: [
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/tests/**/*.{ts,tsx,js,jsx}',
        '**/__tests__/**/*.{ts,tsx,js,jsx}'
      ],
      options: {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'es5',
        // Test descriptions can be longer for clarity
        bracketSpacing: true
      }
    },
    
    // Cultural helper files
    {
      files: [
        '**/cultural/**/*.{ts,tsx,js,jsx}',
        '**/prayer-times/**/*.{ts,tsx,js,jsx}',
        '**/holidays/**/*.{ts,tsx,js,jsx}',
        '**/localization/**/*.{ts,tsx,js,jsx}'
      ],
      options: {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'es5',
        // Cultural code often has descriptive names
        bracketSpacing: true
      }
    },
    
    // Healthcare security and PDPA files
    {
      files: [
        '**/security/**/*.{ts,tsx,js,jsx}',
        '**/pdpa/**/*.{ts,tsx,js,jsx}',
        '**/compliance/**/*.{ts,tsx,js,jsx}',
        '**/audit/**/*.{ts,tsx,js,jsx}'
      ],
      options: {
        printWidth: 120, // Security code often needs more space
        singleQuote: true,
        trailingComma: 'es5',
        bracketSpacing: true,
        // Security code clarity is paramount
        arrowParens: 'always'
      }
    },
    
    // Docker and deployment files
    {
      files: ['Dockerfile*', 'docker-compose*.yml'],
      options: {
        printWidth: 100,
        tabWidth: 2,
        proseWrap: 'preserve'
      }
    },
    
    // Documentation files
    {
      files: ['docs/**/*.md', 'README*.md', 'CHANGELOG*.md'],
      options: {
        printWidth: 80,
        proseWrap: 'preserve',
        tabWidth: 2,
        // Healthcare documentation formatting
        bracketSpacing: true
      }
    }
  ],
  
  // Plugin-specific configurations
  plugins: [
    // Prettier plugin for sorting imports
    '@trivago/prettier-plugin-sort-imports'
  ],
  
  // Import sorting configuration for healthcare modules
  importOrder: [
    // React and React Native imports first
    '^react',
    '^react-native',
    
    // External libraries
    '<THIRD_PARTY_MODULES>',
    
    // Malaysian healthcare services
    '^@cultural/(.*)$',
    '^@healthcare/(.*)$',
    '^@pdpa/(.*)$',
    '^@security/(.*)$',
    
    // Internal modules
    '^@/(.*)$',
    '^@config/(.*)$',
    '^@middleware/(.*)$',
    '^@utils/(.*)$',
    '^@models/(.*)$',
    '^@routes/(.*)$',
    '^@services/(.*)$',
    '^@types/(.*)$',
    
    // Relative imports
    '^[./]'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  
  // Ignore patterns for files that shouldn't be formatted
  ignore: [
    // Build outputs
    'dist/**/*',
    'build/**/*',
    'coverage/**/*',
    
    // Dependencies
    'node_modules/**/*',
    
    // Generated files
    '**/*.generated.*',
    '**/generated/**/*',
    
    // Binary files
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.svg',
    '**/*.ico',
    
    // Logs
    '**/*.log',
    'logs/**/*',
    
    // Temporary files
    '**/*.tmp',
    '**/*.temp',
    
    // Database files
    '**/*.db',
    '**/*.sqlite',
    
    // Environment files (may contain sensitive data)
    '.env*',
    
    // Healthcare data files (may contain patient information)
    '**/patient-data/**/*',
    '**/health-records/**/*',
    
    // Lock files
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    
    // Cache files
    '.cache/**/*',
    '**/.cache/**/*'
  ]
};

// Export configuration for use in other tools
module.exports.healthcareFormatting = {
  // Malaysian cultural text formatting guidelines
  cultural: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'MYR',
    languages: ['ms', 'en', 'zh', 'ta']
  },
  
  // Healthcare documentation standards
  healthcare: {
    lineLength: 80,
    preserveWhitespace: true,
    maintainStructure: true
  },
  
  // Code formatting for healthcare compliance
  compliance: {
    strictFormatting: true,
    auditableCode: true,
    readableComments: true
  }
};