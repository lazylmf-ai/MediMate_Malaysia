/**
 * Metro configuration for MediMate Malaysia
 * Optimized for Malaysian cultural assets and multi-language support
 * Supports healthcare-specific bundling and localization
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration optimized for Malaysian healthcare app
 */
const config = {
  projectRoot: __dirname,
  
  // Resolver configuration for cultural assets
  resolver: {
    alias: {
      // Cultural asset aliases
      '@cultural': path.resolve(__dirname, 'src/assets/cultural'),
      '@i18n': path.resolve(__dirname, 'src/i18n'),
      '@themes': path.resolve(__dirname, 'src/themes'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@screens': path.resolve(__dirname, 'src/screens'),
    },
    
    // Asset extensions for Malaysian cultural content
    assetExts: [
      'bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp', // Image formats
      'mp4', 'webm', 'mp3', 'wav', 'aac', // Media formats  
      'm4v', 'mov', 'avi',
      'ttf', 'otf', 'woff', 'woff2', // Font formats for Malaysian languages
      'json', // Cultural data files
      'pdf', // Healthcare documents
      'xml' // Islamic calendar data
    ],
    
    // Source extensions for Malaysian localization
    sourceExts: [
      'js', 'jsx', 'ts', 'tsx', 'json', 
      'bm.js', 'ms.js', 'zh.js', 'ta.js', // Language-specific files
      'android.js', 'ios.js', 'native.js', 'web.js'
    ],

    // Platform-specific extensions
    platforms: ['ios', 'android', 'web'],

    // Block list for excluding unnecessary files
    blockList: [
      /\.git\/.*/,
      /node_modules\/.*\/android\/.*/,
      /node_modules\/.*\/ios\/.*/,
    ]
  },

  // Transformer configuration for cultural assets
  transformer: {
    // Enable Hermes for better performance
    hermesCommand: 'hermes',
    
    // Asset transformer configuration
    assetRegistryPath: 'react-native/Libraries/Image/AssetRegistry',
    
    // SVG transformer for cultural icons
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
    
    // Enable inline requires for cultural assets (lazy loading)
    inlineRequires: true,
    
    // Minifier configuration
    minifierConfig: {
      // Preserve Islamic and Malaysian terms in minification
      reserved: [
        'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', // Prayer names
        'Halal', 'Haram', 'JAKIM', // Islamic terms
        'Ramadan', 'Eid', 'Thaipusam', 'Deepavali', // Cultural events
        'PDPA', 'MOH', 'MySejahtera' // Malaysian healthcare terms
      ]
    },

    // Experimental features for cultural assets
    experimental: {
      importBundleSupport: true
    }
  },

  // Server configuration for Malaysian development
  server: {
    port: 8081,
    
    // Enhanced hot reload for cultural content
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Log cultural asset requests for debugging
        if (req.url.includes('/cultural/') || req.url.includes('/i18n/')) {
          console.log(`🌍 Loading cultural asset: ${req.url}`);
        }
        
        // Add Malaysian timezone headers
        res.setHeader('X-Timezone', 'Asia/Kuala_Lumpur');
        res.setHeader('X-Cultural-Context', 'Malaysian-Healthcare');
        
        middleware(req, res, next);
      };
    }
  },

  // Serializer configuration for bundle optimization
  serializer: {
    // Custom serializer for cultural bundles
    customSerializer: require('./scripts/cultural-bundle-serializer'),
    
    // Create separate bundles for different languages
    createModuleIdFactory: () => {
      let nextId = 0;
      const moduleIds = new Map();
      
      return (path) => {
        if (moduleIds.has(path)) {
          return moduleIds.get(path);
        }
        
        // Assign consistent IDs for cultural modules
        if (path.includes('/i18n/') || path.includes('/cultural/')) {
          const culturalId = `cultural_${nextId++}`;
          moduleIds.set(path, culturalId);
          return culturalId;
        }
        
        const id = nextId++;
        moduleIds.set(path, id);
        return id;
      };
    },

    // Module filter for cultural content
    processModuleFilter: (module) => {
      // Always include cultural modules
      if (module.path.includes('/cultural/') || 
          module.path.includes('/i18n/') ||
          module.path.includes('/themes/')) {
        return true;
      }
      
      // Standard module filtering
      return true;
    }
  },

  // Watcher configuration for Malaysian development workflow
  watchFolders: [
    // Watch cultural asset directories
    path.resolve(__dirname, 'src/assets/cultural'),
    path.resolve(__dirname, 'src/i18n'),
    path.resolve(__dirname, 'src/themes'),
    
    // Watch shared backend services (if needed)
    path.resolve(__dirname, '../src/services'),
    path.resolve(__dirname, '../scripts/data-seeding'),
    
    // Watch cultural data
    path.resolve(__dirname, '../data/cultural')
  ],

  // Cache configuration optimized for cultural assets
  cacheStores: [
    {
      name: 'FileSystemCache',
      params: {
        cacheDir: path.resolve(__dirname, 'node_modules/.cache/metro'),
        
        // Cache cultural assets longer (they change less frequently)
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for cultural assets
      }
    }
  ]
};

// Malaysian development environment variables
const malaiyasianEnvConfig = {
  // Development server configuration
  DEV_SERVER_HOST: process.env.DEV_SERVER_HOST || 'localhost',
  DEV_SERVER_PORT: process.env.DEV_SERVER_PORT || 8081,
  
  // Cultural asset CDN (for production)
  CULTURAL_ASSETS_CDN: process.env.CULTURAL_ASSETS_CDN || null,
  
  // Malaysian timezone
  DEFAULT_TIMEZONE: 'Asia/Kuala_Lumpur',
  
  // Cultural feature flags
  ENABLE_PRAYER_TIMES: process.env.ENABLE_PRAYER_TIMES !== 'false',
  ENABLE_CULTURAL_THEMES: process.env.ENABLE_CULTURAL_THEMES !== 'false',
  ENABLE_MULTILINGUAL: process.env.ENABLE_MULTILINGUAL !== 'false',
  
  // Healthcare-specific flags
  ENABLE_HALAL_INDICATORS: process.env.ENABLE_HALAL_INDICATORS !== 'false',
  ENABLE_RAMADAN_MODE: process.env.ENABLE_RAMADAN_MODE !== 'false'
};

// Add environment variables to global for runtime access
Object.assign(global, { __MALAYSIAN_CONFIG__: malaiyasianEnvConfig });

// Performance optimizations for Malaysian healthcare context
const optimizationConfig = {
  // Preload cultural assets that are commonly used
  preloadBundles: [
    'cultural/prayer-times',
    'cultural/holidays',
    'i18n/common',
    'themes/healthcare'
  ],
  
  // Code splitting for cultural features
  codeSplitting: {
    splitPrayerTimes: true,
    splitHolidayCalendar: true,
    splitMultilingualContent: true,
    splitCulturalThemes: true
  },
  
  // Asset optimization
  assets: {
    // Optimize images for Malaysian mobile networks
    imageQuality: 0.8,
    enableWebP: true,
    
    // Preload critical cultural assets
    preloadCritical: [
      'cultural/icons/prayer.png',
      'cultural/icons/halal.png',
      'cultural/flags/malaysia.png'
    ]
  }
};

// Development mode enhancements
if (__DEV__) {
  // Enhanced logging for cultural features
  config.transformer.enableCulturalLogging = true;
  
  // Fast refresh for cultural components
  config.server.enableCulturalRefresh = true;
  
  // Debug cultural asset loading
  config.resolver.enableCulturalDebug = true;
}

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Optimize cultural assets for production
  config.transformer.culturalAssetOptimization = {
    enableCompression: true,
    enableCaching: true,
    enableCDN: !!process.env.CULTURAL_ASSETS_CDN
  };
  
  // Bundle splitting for faster loading
  config.serializer.splitBundles = optimizationConfig.codeSplitting;
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

// Export Malaysian-specific configuration for use by other tools
module.exports.malaysianConfig = malaiyasianEnvConfig;
module.exports.optimizationConfig = optimizationConfig;