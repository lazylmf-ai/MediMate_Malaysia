/**
 * Cultural Theme Provider
 * 
 * Provides cultural-appropriate UI themes, colors, and styling
 * based on user language and cultural preferences for Malaysian communities.
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import { useAppSelector } from '@/store/hooks';
import type { SupportedLanguage } from '@/i18n/translations';

interface ColorPalette {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

interface CulturalTheme {
  name: string;
  language: SupportedLanguage;
  colors: ColorPalette;
  fonts: {
    primary: string;
    secondary: string;
    display: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  culturalElements: {
    direction: 'ltr' | 'rtl';
    statusBarStyle: StatusBarStyle;
    headerStyle: 'default' | 'minimal' | 'cultural';
    iconStyle: 'outlined' | 'filled' | 'rounded';
    buttonStyle: 'standard' | 'rounded' | 'cultural';
  };
  accessibility: {
    minimumTouchTarget: number;
    textScaling: number;
    contrastRatio: 'normal' | 'high' | 'maximum';
  };
}

// Theme definitions for each cultural context
const culturalThemes: Record<SupportedLanguage, CulturalTheme> = {
  en: {
    name: 'International',
    language: 'en',
    colors: {
      primary: '#007AFF',
      primaryDark: '#0056CC',
      secondary: '#5856D6',
      background: '#F2F2F7',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      text: '#000000',
      textSecondary: '#6D6D80',
      border: '#C6C6C8',
      accent: '#FF9500',
      error: '#FF3B30',
      warning: '#FF9500',
      success: '#34C759',
      info: '#007AFF',
    },
    fonts: {
      primary: 'System',
      secondary: 'System',
      display: 'System',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 6,
      md: 12,
      lg: 18,
      xl: 24,
    },
    culturalElements: {
      direction: 'ltr',
      statusBarStyle: 'dark-content',
      headerStyle: 'default',
      iconStyle: 'outlined',
      buttonStyle: 'standard',
    },
    accessibility: {
      minimumTouchTarget: 44,
      textScaling: 1.0,
      contrastRatio: 'normal',
    },
  },

  ms: {
    name: 'Malaysian',
    language: 'ms',
    colors: {
      primary: '#C41E3A', // Malaysia flag red
      primaryDark: '#9A0F28',
      secondary: '#003F7F', // Malaysia flag blue
      background: '#F8F9FA',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#6B7280',
      border: '#D1D5DB',
      accent: '#FFC72C', // Malaysian gold
      error: '#DC2626',
      warning: '#F59E0B',
      success: '#059669',
      info: '#2563EB',
    },
    fonts: {
      primary: 'System',
      secondary: 'System',
      display: 'System',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 8,
      md: 16,
      lg: 20,
      xl: 28,
    },
    culturalElements: {
      direction: 'ltr',
      statusBarStyle: 'light-content',
      headerStyle: 'cultural',
      iconStyle: 'rounded',
      buttonStyle: 'rounded',
    },
    accessibility: {
      minimumTouchTarget: 48,
      textScaling: 1.1,
      contrastRatio: 'high',
    },
  },

  zh: {
    name: 'Chinese',
    language: 'zh',
    colors: {
      primary: '#DC143C', // Traditional Chinese red
      primaryDark: '#B91C3C',
      secondary: '#B91C1C',
      background: '#FEF7F0',
      surface: '#FFFFFF',
      card: '#FFFBF0',
      text: '#1C1C1C',
      textSecondary: '#737373',
      border: '#E5E7EB',
      accent: '#F59E0B', // Gold accent
      error: '#EF4444',
      warning: '#F97316',
      success: '#10B981',
      info: '#3B82F6',
    },
    fonts: {
      primary: 'PingFang SC, Noto Sans CJK SC, SimHei, System',
      secondary: 'PingFang SC, Noto Sans CJK SC, SimHei, System',
      display: 'PingFang SC, Noto Sans CJK SC, SimHei, System',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    culturalElements: {
      direction: 'ltr',
      statusBarStyle: 'light-content',
      headerStyle: 'cultural',
      iconStyle: 'rounded',
      buttonStyle: 'cultural',
    },
    accessibility: {
      minimumTouchTarget: 44,
      textScaling: 1.0,
      contrastRatio: 'normal',
    },
  },

  ta: {
    name: 'Tamil',
    language: 'ta',
    colors: {
      primary: '#FF6B35', // Traditional Tamil orange
      primaryDark: '#E55A2B',
      secondary: '#8B5CF6',
      background: '#FDF8F6',
      surface: '#FFFFFF',
      card: '#FFFAF8',
      text: '#1A1A1A',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      accent: '#10B981', // Traditional Tamil green
      error: '#EF4444',
      warning: '#F59E0B',
      success: '#059669',
      info: '#3B82F6',
    },
    fonts: {
      primary: 'Noto Sans Tamil, Tamil Sangam MN, System',
      secondary: 'Noto Sans Tamil, Tamil Sangam MN, System',
      display: 'Noto Sans Tamil, Tamil Sangam MN, System',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 6,
      md: 12,
      lg: 16,
      xl: 20,
    },
    culturalElements: {
      direction: 'ltr',
      statusBarStyle: 'dark-content',
      headerStyle: 'cultural',
      iconStyle: 'rounded',
      buttonStyle: 'cultural',
    },
    accessibility: {
      minimumTouchTarget: 46,
      textScaling: 1.05,
      contrastRatio: 'high',
    },
  },
};

interface CulturalThemeContextType {
  theme: CulturalTheme;
  isDarkMode: boolean;
  isElderlyMode: boolean;
  toggleDarkMode: () => void;
  updateAccessibilitySettings: (settings: Partial<CulturalTheme['accessibility']>) => void;
}

const CulturalThemeContext = createContext<CulturalThemeContextType | null>(null);

interface CulturalThemeProviderProps {
  children: ReactNode;
  forceDarkMode?: boolean;
}

export function CulturalThemeProvider({ 
  children, 
  forceDarkMode = false 
}: CulturalThemeProviderProps) {
  const { currentLanguage } = useTranslation();
  const culturalProfile = useAppSelector(state => state.cultural.profile);
  
  // Get base theme for current language
  const baseTheme = culturalThemes[currentLanguage] || culturalThemes.en;
  
  // Apply cultural and accessibility preferences
  const theme = useMemo(() => {
    let modifiedTheme = { ...baseTheme };
    
    // Apply elderly-friendly modifications
    const isElderlyMode = culturalProfile?.accessibility?.elderlyOptimizations?.largeButtons ?? false;
    
    if (isElderlyMode) {
      modifiedTheme.accessibility = {
        ...modifiedTheme.accessibility,
        minimumTouchTarget: 56,
        textScaling: 1.3,
        contrastRatio: 'high',
      };
      
      // Enhance contrast for elderly users
      modifiedTheme.colors = {
        ...modifiedTheme.colors,
        text: '#000000',
        background: '#FFFFFF',
        border: '#333333',
      };
      
      // Larger spacing for elderly users
      modifiedTheme.spacing = {
        xs: 6,
        sm: 12,
        md: 24,
        lg: 32,
        xl: 40,
      };
    }
    
    // Apply high contrast if requested
    const useHighContrast = culturalProfile?.accessibility?.highContrast ?? false;
    
    if (useHighContrast) {
      modifiedTheme.colors = {
        ...modifiedTheme.colors,
        text: '#000000',
        background: '#FFFFFF',
        border: '#000000',
        textSecondary: '#333333',
      };
      modifiedTheme.accessibility.contrastRatio = 'maximum';
    }
    
    return modifiedTheme;
  }, [baseTheme, culturalProfile]);

  // Dark mode state (simplified for this implementation)
  const [isDarkMode, setIsDarkMode] = React.useState(forceDarkMode);
  const isElderlyMode = culturalProfile?.accessibility?.elderlyOptimizations?.largeButtons ?? false;

  const toggleDarkMode = React.useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const updateAccessibilitySettings = React.useCallback((
    settings: Partial<CulturalTheme['accessibility']>
  ) => {
    // This would update the theme accessibility settings
    // For now, just log the change
    console.log('Accessibility settings updated:', settings);
  }, []);

  // Set status bar style based on theme
  React.useEffect(() => {
    StatusBar.setBarStyle(theme.culturalElements.statusBarStyle, true);
  }, [theme.culturalElements.statusBarStyle]);

  const contextValue: CulturalThemeContextType = {
    theme,
    isDarkMode,
    isElderlyMode,
    toggleDarkMode,
    updateAccessibilitySettings,
  };

  return (
    <CulturalThemeContext.Provider value={contextValue}>
      {children}
    </CulturalThemeContext.Provider>
  );
}

// Hook to use cultural theme
export function useCulturalTheme(): CulturalThemeContextType {
  const context = useContext(CulturalThemeContext);
  
  if (!context) {
    throw new Error('useCulturalTheme must be used within a CulturalThemeProvider');
  }
  
  return context;
}

// Helper hook for styling components with cultural context
export function useCulturalStyles() {
  const { theme, isElderlyMode } = useCulturalTheme();
  
  const getButtonStyle = React.useCallback((variant: 'primary' | 'secondary' | 'tertiary' = 'primary') => {
    const baseStyle = {
      minHeight: theme.accessibility.minimumTouchTarget,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    };
    
    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.secondary,
        };
      case 'tertiary':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      default:
        return baseStyle;
    }
  }, [theme, isElderlyMode]);
  
  const getTextStyle = React.useCallback((variant: 'body' | 'heading' | 'caption' = 'body') => {
    const baseStyle = {
      fontFamily: theme.fonts.primary,
      color: theme.colors.text,
    };
    
    const scaling = theme.accessibility.textScaling;
    
    switch (variant) {
      case 'heading':
        return {
          ...baseStyle,
          fontSize: 18 * scaling,
          fontWeight: '600',
          fontFamily: theme.fonts.display,
        };
      case 'body':
        return {
          ...baseStyle,
          fontSize: 16 * scaling,
        };
      case 'caption':
        return {
          ...baseStyle,
          fontSize: 14 * scaling,
          color: theme.colors.textSecondary,
        };
      default:
        return baseStyle;
    }
  }, [theme]);
  
  const getCardStyle = React.useCallback(() => {
    return {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    };
  }, [theme]);
  
  return {
    theme,
    isElderlyMode,
    getButtonStyle,
    getTextStyle,
    getCardStyle,
  };
}

export default CulturalThemeProvider;