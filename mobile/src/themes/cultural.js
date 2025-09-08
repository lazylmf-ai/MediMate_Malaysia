/**
 * Malaysian Cultural Theme System
 * Healthcare-focused design system with Malaysian cultural elements
 * Supports multiple themes: Modern Malaysian, Islamic Healthcare, Multi-Cultural
 */

import { Dimensions, PixelRatio } from 'react-native';

// Device dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const pixelRatio = PixelRatio.get();

/**
 * Malaysian National Colors and Cultural Palette
 */
const malaysianColors = {
  // National flag colors
  national: {
    red: '#CC0000',        // Malaysian flag red
    blue: '#010066',       // Malaysian flag blue  
    yellow: '#FFCC00',     // Malaysian flag yellow
    white: '#FFFFFF',      // Malaysian flag white
  },
  
  // Healthcare system colors
  healthcare: {
    primary: '#006A4E',     // Malaysian healthcare green
    secondary: '#0066CC',   // Trustworthy medical blue
    accent: '#FF6B35',      // Warm healthcare orange
    success: '#28A745',     // Success green
    warning: '#FFC107',     // Warning amber
    danger: '#DC3545',      // Alert red
    info: '#17A2B8',        // Information blue
  },
  
  // Islamic/Malay cultural colors
  islamic: {
    primary: '#006A4E',     // Islamic green
    gold: '#FFD700',        // Islamic gold
    calligraphy: '#2C3E50', // Traditional text color
    prayer: '#4A7C59',      // Prayer time green
    ramadan: '#8B4513',     // Ramadan brown
    mosque: '#2E8B57',      // Mosque green
  },
  
  // Chinese cultural colors
  chinese: {
    red: '#E60026',         // Chinese red
    gold: '#FFD700',        // Chinese gold
    jade: '#00A86B',        // Jade green
    imperial: '#FFD700',    // Imperial yellow
    prosperity: '#FF6B6B',  // Prosperity red
  },
  
  // Indian/Tamil cultural colors
  indian: {
    saffron: '#FF9933',     // Saffron
    turmeric: '#E4B429',    // Turmeric yellow
    vermillion: '#E34234',  // Vermillion red
    henna: '#A0522D',       // Henna brown
    lotus: '#FFB6C1',       // Lotus pink
  },
  
  // Neutral colors for accessibility
  neutral: {
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    gray: '#6C757D',
    darkGray: '#495057',
    black: '#000000',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    border: '#E9ECEF',
  }
};

/**
 * Typography system for Malaysian languages
 */
const typography = {
  // Font families for different scripts
  fontFamilies: {
    // Latin script (English, Bahasa Malaysia)
    latin: {
      regular: 'System',
      medium: 'System-Medium',
      bold: 'System-Bold',
      light: 'System-Light',
    },
    
    // Chinese script
    chinese: {
      regular: 'PingFang-SC-Regular',
      medium: 'PingFang-SC-Medium',
      bold: 'PingFang-SC-Semibold',
      light: 'PingFang-SC-Light',
    },
    
    // Tamil script
    tamil: {
      regular: 'Tamil-Regular',
      medium: 'Tamil-Medium',
      bold: 'Tamil-Bold',
      light: 'Tamil-Light',
    },
    
    // Arabic script (for Islamic terms)
    arabic: {
      regular: 'Arabic-Regular',
      medium: 'Arabic-Medium',
      bold: 'Arabic-Bold',
      light: 'Arabic-Light',
    }
  },
  
  // Font sizes adapted for Malaysian mobile usage
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    
    // Healthcare-specific sizes
    medicationLabel: 14,
    dosageInfo: 16,
    prayerTime: 20,
    emergencyAlert: 18,
  },
  
  // Line heights optimized for readability
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    
    // Script-specific line heights
    chinese: 1.6,
    tamil: 1.7,
    arabic: 1.8,
  },
  
  // Letter spacing for different scripts
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    
    // Cultural adjustments
    chinese: 0.2,
    tamil: 0.1,
    arabic: 0.3,
  }
};

/**
 * Spacing system based on 8pt grid
 */
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  
  // Component-specific spacing
  cardPadding: 16,
  screenPadding: 20,
  sectionSpacing: 24,
  itemSpacing: 12,
  
  // Cultural element spacing
  prayerTimeSpacing: 20,
  holidaySpacing: 16,
  culturalIconSpacing: 12,
};

/**
 * Border radius for Malaysian aesthetic
 */
const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
  
  // Component-specific
  card: 12,
  button: 8,
  input: 6,
  culturalElement: 10,
};

/**
 * Shadow system for depth
 */
const shadows = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
  
  // Cultural element shadows
  cultural: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  }
};

/**
 * Modern Malaysian Theme (Default)
 */
const modernMalaysianTheme = {
  name: 'Modern Malaysian',
  colors: {
    primary: malaysianColors.healthcare.primary,
    primaryLight: '#4A9D7A',
    primaryDark: '#004A38',
    
    secondary: malaysianColors.healthcare.secondary,
    secondaryLight: '#3385D6',
    secondaryDark: '#004D99',
    
    accent: malaysianColors.healthcare.accent,
    accentLight: '#FF8A5B',
    accentDark: '#E5552A',
    
    background: malaysianColors.neutral.background,
    surface: malaysianColors.neutral.surface,
    
    success: malaysianColors.healthcare.success,
    warning: malaysianColors.healthcare.warning,
    danger: malaysianColors.healthcare.danger,
    info: malaysianColors.healthcare.info,
    
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
      disabled: '#999999',
      inverse: '#FFFFFF',
    },
    
    border: malaysianColors.neutral.border,
    shadow: 'rgba(0, 0, 0, 0.1)',
    
    // Cultural accents
    cultural: {
      malay: malaysianColors.islamic.primary,
      chinese: malaysianColors.chinese.red,
      indian: malaysianColors.indian.saffron,
      national: malaysianColors.national.blue,
    }
  },
  
  typography: {
    ...typography,
    defaultFontFamily: typography.fontFamilies.latin.regular,
  },
  
  spacing,
  borderRadius,
  shadows,
  
  // Component-specific styles
  components: {
    card: {
      backgroundColor: malaysianColors.neutral.surface,
      borderRadius: borderRadius.card,
      ...shadows.sm,
      padding: spacing.cardPadding,
    },
    
    button: {
      primary: {
        backgroundColor: malaysianColors.healthcare.primary,
        borderRadius: borderRadius.button,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      },
      secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: malaysianColors.healthcare.primary,
        borderRadius: borderRadius.button,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      }
    },
    
    prayerTimeCard: {
      backgroundColor: malaysianColors.islamic.prayer,
      borderRadius: borderRadius.culturalElement,
      ...shadows.cultural,
      padding: spacing.prayerTimeSpacing,
    },
    
    holidayBanner: {
      backgroundColor: malaysianColors.chinese.red,
      borderRadius: borderRadius.md,
      padding: spacing.holidaySpacing,
      marginVertical: spacing.sm,
    }
  }
};

/**
 * Islamic Healthcare Theme
 */
const islamicHealthcareTheme = {
  ...modernMalaysianTheme,
  name: 'Islamic Healthcare',
  colors: {
    ...modernMalaysianTheme.colors,
    primary: malaysianColors.islamic.primary,
    primaryLight: '#4A9D7A',
    primaryDark: '#004A38',
    
    accent: malaysianColors.islamic.gold,
    accentLight: '#FFE55C',
    accentDark: '#DAA520',
    
    cultural: {
      ...modernMalaysianTheme.colors.cultural,
      islamic: malaysianColors.islamic.primary,
      prayer: malaysianColors.islamic.prayer,
      ramadan: malaysianColors.islamic.ramadan,
    }
  },
  
  components: {
    ...modernMalaysianTheme.components,
    prayerTimeCard: {
      backgroundColor: malaysianColors.islamic.primary,
      borderRadius: borderRadius.culturalElement,
      ...shadows.cultural,
      padding: spacing.prayerTimeSpacing,
    }
  }
};

/**
 * Multi-Cultural Theme
 */
const multiCulturalTheme = {
  ...modernMalaysianTheme,
  name: 'Multi-Cultural',
  colors: {
    ...modernMalaysianTheme.colors,
    primary: malaysianColors.national.blue,
    primaryLight: '#3366CC',
    primaryDark: '#000D4D',
    
    accent: malaysianColors.national.red,
    accentLight: '#E63333',
    accentDark: '#990000',
    
    cultural: {
      malay: malaysianColors.islamic.primary,
      chinese: malaysianColors.chinese.red,
      indian: malaysianColors.indian.saffron,
      national: malaysianColors.national.yellow,
    }
  }
};

/**
 * Accessibility Theme (High Contrast)
 */
const accessibilityTheme = {
  ...modernMalaysianTheme,
  name: 'Accessibility',
  colors: {
    ...modernMalaysianTheme.colors,
    primary: '#000066',
    primaryLight: '#3333CC',
    primaryDark: '#000033',
    
    secondary: '#CC0000',
    secondaryLight: '#FF3333',
    secondaryDark: '#990000',
    
    text: {
      primary: '#000000',
      secondary: '#333333',
      disabled: '#666666',
      inverse: '#FFFFFF',
    },
    
    background: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#000000',
  },
  
  // Enhanced contrast for accessibility
  typography: {
    ...typography,
    fontSizes: {
      ...typography.fontSizes,
      // Larger base sizes for better readability
      xs: 14,
      sm: 16,
      md: 18,
      lg: 20,
      xl: 22,
    }
  }
};

/**
 * Theme configuration based on user preferences and system settings
 */
const getThemeForContext = (context) => {
  const { 
    userPreference = 'modern',
    isAccessibilityEnabled = false,
    culturalContext = 'multi',
    systemTheme = 'light'
  } = context;

  // Accessibility override
  if (isAccessibilityEnabled) {
    return accessibilityTheme;
  }

  // Theme selection based on cultural context
  switch (userPreference) {
    case 'islamic':
      return islamicHealthcareTheme;
    case 'multicultural':
      return multiCulturalTheme;
    case 'accessibility':
      return accessibilityTheme;
    default:
      return modernMalaysianTheme;
  }
};

/**
 * Responsive helper functions
 */
const responsive = {
  // Breakpoints for different screen sizes
  breakpoints: {
    phone: 0,
    tablet: 768,
  },
  
  // Scale factor based on screen size
  scale: (size) => {
    const scale = screenWidth / 375; // Base scale on iPhone 6/7/8 width
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  },
  
  // Responsive font size
  fontSize: (size) => {
    const scale = screenWidth / 375;
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  },
  
  // Check if device is tablet
  isTablet: () => screenWidth >= 768,
  
  // Get responsive spacing
  spacing: (baseSpacing) => {
    const isTablet = screenWidth >= 768;
    return isTablet ? baseSpacing * 1.5 : baseSpacing;
  }
};

/**
 * Cultural component helpers
 */
const culturalHelpers = {
  // Get color for cultural context
  getCulturalColor: (culture, theme = modernMalaysianTheme) => {
    return theme.colors.cultural[culture] || theme.colors.primary;
  },
  
  // Get appropriate font family for language
  getFontFamily: (language, weight = 'regular') => {
    const fontFamilyMap = {
      'ms': typography.fontFamilies.latin[weight],
      'en': typography.fontFamilies.latin[weight],
      'zh': typography.fontFamilies.chinese[weight],
      'ta': typography.fontFamilies.tamil[weight],
      'ar': typography.fontFamilies.arabic[weight],
    };
    
    return fontFamilyMap[language] || typography.fontFamilies.latin[weight];
  },
  
  // Get appropriate line height for script
  getLineHeight: (language) => {
    const lineHeightMap = {
      'zh': typography.lineHeights.chinese,
      'ta': typography.lineHeights.tamil,
      'ar': typography.lineHeights.arabic,
    };
    
    return lineHeightMap[language] || typography.lineHeights.normal;
  },
  
  // Get cultural icon color
  getCulturalIconColor: (iconType, theme = modernMalaysianTheme) => {
    const iconColorMap = {
      'prayer': theme.colors.cultural.malay,
      'chinese_new_year': theme.colors.cultural.chinese,
      'deepavali': theme.colors.cultural.indian,
      'national_day': theme.colors.cultural.national,
      'halal': theme.colors.cultural.malay,
    };
    
    return iconColorMap[iconType] || theme.colors.primary;
  }
};

/**
 * Export theme system
 */
export {
  malaysianColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  modernMalaysianTheme,
  islamicHealthcareTheme,
  multiCulturalTheme,
  accessibilityTheme,
  getThemeForContext,
  responsive,
  culturalHelpers,
};

export default modernMalaysianTheme;