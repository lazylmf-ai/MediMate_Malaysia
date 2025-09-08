/**
 * ESLint Configuration for MediMate Malaysia
 * Healthcare-focused linting rules with Malaysian cultural considerations
 * PDPA compliance and security-focused validation
 */

module.exports = {
  root: true,
  
  // Parser configuration for TypeScript
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: [
      './tsconfig.json',
      './backend/tsconfig.json',
      './mobile/tsconfig.json'
    ],
    tsconfigRootDir: __dirname,
    extraFileExtensions: ['.json']
  },

  // Environment settings
  env: {
    node: true,
    browser: true,
    es2022: true,
    jest: true,
    'react-native/react-native': true
  },

  // Plugins for healthcare and Malaysian context
  plugins: [
    '@typescript-eslint',
    'security',
    'react',
    'react-hooks',
    'react-native',
    'import',
    'jsx-a11y',
    'jest',
    'healthcare-security',
    'malaysian-cultural'
  ],

  // Extended configurations
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:security/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'plugin:jest/recommended'
  ],

  // Global variables for Malaysian healthcare context
  globals: {
    __DEV__: 'readonly',
    __MALAYSIAN_CONFIG__: 'readonly',
    __HEALTHCARE_MODE__: 'readonly',
    __PDPA_COMPLIANCE__: 'readonly',
    fetch: 'readonly'
  },

  // Settings
  settings: {
    react: {
      version: 'detect'
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [
          './tsconfig.json',
          './backend/tsconfig.json',
          './mobile/tsconfig.json'
        ]
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
      }
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    }
  },

  // Healthcare and Malaysian cultural rules
  rules: {
    // TypeScript Rules - Healthcare Grade Strictness
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true 
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // Healthcare Security Rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',

    // Healthcare Data Handling Rules (Custom)
    'healthcare-security/no-patient-data-logging': 'error',
    'healthcare-security/require-encryption-for-pii': 'error',
    'healthcare-security/no-hardcoded-credentials': 'error',
    'healthcare-security/validate-input-sanitization': 'error',
    'healthcare-security/require-audit-logging': 'warn',

    // Malaysian Cultural Rules (Custom)
    'malaysian-cultural/proper-date-format': 'warn',
    'malaysian-cultural/currency-format-validation': 'warn',
    'malaysian-cultural/prayer-time-validation': 'error',
    'malaysian-cultural/halal-indicator-required': 'warn',
    'malaysian-cultural/multi-language-keys': 'warn',

    // Code Quality Rules
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'object-shorthand': 'error',
    'prefer-destructuring': ['warn', { object: true, array: false }],
    'prefer-template': 'error',

    // Import/Export Rules
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'error',
    'import/no-absolute-path': 'error',
    'import/no-self-import': 'error',
    'import/no-cycle': 'error',
    'import/no-useless-path-segments': 'error',
    'import/no-deprecated': 'warn',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],

    // React/React Native Rules
    'react/prop-types': 'off', // Using TypeScript instead
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/display-name': 'warn',
    'react/no-unused-prop-types': 'error',
    'react/no-unused-state': 'error',
    'react/jsx-boolean-value': 'error',
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
    'react/jsx-fragments': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/self-closing-comp': 'error',

    // React Hooks Rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native Specific Rules
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'off', // Allow text outside Text components for healthcare forms

    // Accessibility Rules for Malaysian Healthcare
    'jsx-a11y/accessible-emoji': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',

    // Jest Testing Rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error'
  },

  // Override rules for specific file patterns
  overrides: [
    // Backend-specific rules
    {
      files: ['backend/src/**/*.ts'],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react-native/no-unused-styles': 'off',
        'jsx-a11y/accessible-emoji': 'off',
        'no-console': 'off' // Allow console in backend
      }
    },

    // Mobile-specific rules
    {
      files: ['mobile/src/**/*.{ts,tsx}'],
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'react-native/no-inline-styles': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn' // More lenient for React Native
      }
    },

    // Test files
    {
      files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/tests/**/*.{ts,tsx,js,jsx}'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'security/detect-object-injection': 'off',
        'healthcare-security/no-patient-data-logging': 'off' // Test data is allowed
      }
    },

    // Configuration files
    {
      files: ['*.config.{js,ts}', '.*rc.{js,ts}'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-anonymous-default-export': 'off'
      }
    },

    // Cultural data files
    {
      files: ['src/i18n/**/*.{js,ts,json}', 'scripts/data-seeding/**/*.{js,ts}'],
      rules: {
        'malaysian-cultural/multi-language-keys': 'error',
        'malaysian-cultural/proper-date-format': 'error',
        'malaysian-cultural/prayer-time-validation': 'error'
      }
    },

    // Healthcare service files
    {
      files: ['**/services/healthcare/**/*.ts', '**/middleware/pdpa/**/*.ts'],
      rules: {
        'healthcare-security/require-encryption-for-pii': 'error',
        'healthcare-security/require-audit-logging': 'error',
        'healthcare-security/no-patient-data-logging': 'error',
        'security/detect-possible-timing-attacks': 'error'
      }
    }
  ]
};