/**
 * Lint-staged Configuration for MediMate Malaysia
 * Healthcare-focused staged file processing with Malaysian cultural validation
 * Optimized for healthcare compliance and code quality
 */

module.exports = {
  // TypeScript and JavaScript files - Healthcare API and Mobile App
  '**/*.{ts,tsx,js,jsx}': [
    // 1. ESLint with healthcare-specific rules
    'eslint --fix --max-warnings=0',
    
    // 2. Prettier formatting with Malaysian healthcare standards
    'prettier --write',
    
    // 3. TypeScript type checking for healthcare safety
    () => 'tsc --noEmit',
    
    // 4. Healthcare security validation
    'node scripts/validate-healthcare-security.js',
    
    // 5. PDPA compliance check
    'node scripts/validate-pdpa-compliance.js'
  ],

  // Backend TypeScript files - Healthcare API
  'backend/src/**/*.{ts,js}': [
    // Healthcare-specific backend validation
    'eslint --fix --max-warnings=0 --config .eslintrc.js',
    'prettier --write',
    
    // Backend security validation
    'node scripts/validate-backend-security.js',
    
    // Healthcare data handling validation
    'node scripts/validate-healthcare-patterns.js'
  ],

  // Mobile TypeScript/React Native files
  'mobile/src/**/*.{ts,tsx,js,jsx}': [
    // Mobile-specific validation with cultural considerations
    'eslint --fix --max-warnings=0',
    'prettier --write',
    
    // Malaysian cultural UI validation
    'node scripts/validate-cultural-ui.js',
    
    // React Native bundle optimization check
    'node scripts/check-mobile-bundle-size.js'
  ],

  // JSON files - Configuration and Cultural Data
  '**/*.json': [
    // JSON formatting and validation
    'prettier --write',
    
    // Cultural data validation for Malaysian content
    'node scripts/validate-cultural-data.js'
  ],

  // Malaysian Cultural Translation Files
  'src/i18n/**/*.json': [
    'prettier --write --print-width=60',
    
    // Malaysian language validation
    'node scripts/validate-translations.js',
    
    // Cultural terminology validation
    'node scripts/validate-cultural-terminology.js'
  ],

  // Healthcare Documentation
  '**/*.md': [
    // Healthcare documentation formatting
    'prettier --write --prose-wrap=preserve',
    
    // Healthcare documentation validation
    'node scripts/validate-healthcare-docs.js',
    
    // Malaysian cultural content validation
    'node scripts/validate-cultural-content.js'
  ],

  // Database Migration Files
  '**/*.sql': [
    // SQL formatting for healthcare schemas
    'prettier --write --print-width=120',
    
    // Healthcare database security validation
    'node scripts/validate-db-security.js',
    
    // PDPA compliance validation for database schemas
    'node scripts/validate-db-pdpa-compliance.js'
  ],

  // Configuration Files
  '**/*.{yml,yaml}': [
    'prettier --write',
    
    // Configuration security validation
    'node scripts/validate-config-security.js'
  ],

  // Package.json files
  '**/package.json': [
    'prettier --write',
    
    // Dependency security validation
    'npm audit --audit-level=moderate',
    
    // Healthcare dependency validation
    'node scripts/validate-healthcare-dependencies.js'
  ],

  // Test Files - Healthcare Test Validation
  '**/*.{test,spec}.{ts,tsx,js,jsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    
    // Healthcare test pattern validation
    'node scripts/validate-healthcare-tests.js',
    
    // PDPA test data compliance
    'node scripts/validate-test-data-compliance.js'
  ],

  // Cultural Asset Files
  'src/assets/cultural/**/*': [
    // Cultural asset validation
    'node scripts/validate-cultural-assets.js',
    
    // Malaysian cultural accuracy check
    'node scripts/validate-malaysian-cultural-accuracy.js'
  ],

  // Healthcare Service Files
  'src/services/healthcare/**/*.{ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    
    // Healthcare service validation
    'node scripts/validate-healthcare-services.js',
    
    // Medical data handling compliance
    'node scripts/validate-medical-data-handling.js'
  ],

  // Security and PDPA Middleware
  'src/middleware/{security,pdpa}/**/*.{ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    
    // Security middleware validation
    'node scripts/validate-security-middleware.js',
    
    // PDPA compliance validation
    'node scripts/validate-pdpa-middleware.js'
  ],

  // Cultural Intelligence Files
  'src/services/cultural/**/*.{ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    
    // Cultural intelligence validation
    'node scripts/validate-cultural-intelligence.js',
    
    // Prayer time accuracy validation
    'node scripts/validate-prayer-times.js',
    
    // Malaysian holiday validation
    'node scripts/validate-malaysian-holidays.js'
  ],

  // Docker and Deployment Files
  'docker/**/*': [
    // Docker security validation
    'node scripts/validate-docker-security.js',
    
    // Healthcare deployment compliance
    'node scripts/validate-deployment-compliance.js'
  ],

  // Scripts Directory
  'scripts/**/*.{js,ts,sh}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    
    // Script security validation
    'node scripts/validate-script-security.js'
  ]
};

// Healthcare-specific validation functions (referenced above)
// These would be implemented as separate validation scripts

/**
 * Example validation script structure for healthcare compliance
 */
const validationScripts = {
  'validate-healthcare-security.js': {
    description: 'Validates healthcare data security patterns',
    checks: [
      'Patient data encryption',
      'Access control patterns',
      'Audit logging requirements',
      'Malaysian healthcare compliance'
    ]
  },

  'validate-pdpa-compliance.js': {
    description: 'PDPA compliance validation for Malaysian healthcare',
    checks: [
      'Consent tracking implementation',
      'Data minimization principles', 
      'Retention policy compliance',
      'Cross-border transfer validation'
    ]
  },

  'validate-cultural-data.js': {
    description: 'Malaysian cultural data accuracy validation',
    checks: [
      'Prayer time calculation accuracy',
      'Malaysian holiday calendar validation',
      'Multi-language content consistency',
      'Cultural terminology accuracy'
    ]
  },

  'validate-healthcare-patterns.js': {
    description: 'Healthcare-specific code pattern validation',
    checks: [
      'Medical data handling patterns',
      'Healthcare workflow compliance',
      'Malaysian healthcare standards',
      'Clinical decision support validation'
    ]
  },

  'validate-cultural-ui.js': {
    description: 'Malaysian cultural UI component validation',
    checks: [
      'Prayer time display accuracy',
      'Cultural color scheme compliance',
      'Multi-language text rendering',
      'Malaysian date/time formatting'
    ]
  }
};

// Export validation scripts metadata for documentation
module.exports.validationScripts = validationScripts;