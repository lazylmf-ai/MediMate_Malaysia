/**
 * Large Text Mode Component
 * Provides adaptive text scaling and layout for elderly users
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAccessibility } from '../useAccessibility';

export interface LargeTextModeProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  variant?: 'screen' | 'card' | 'section' | 'emergency';
  scrollable?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  contentStyle?: ViewStyle;
  padding?: boolean;
  testID?: string;
}

export const LargeTextMode: React.FC<LargeTextModeProps> = ({
  children,
  title,
  subtitle,
  variant = 'section',
  scrollable = false,
  style,
  titleStyle,
  subtitleStyle,
  contentStyle,
  padding = true,
  testID,
}) => {
  const {
    config,
    colors,
    getTextSize,
    getTouchTargetSize,
    isEmergencyMode,
  } = useAccessibility();

  // Calculate spacing based on text size
  const getAdaptiveSpacing = () => {
    const baseSpacing = 16;
    const multiplier = config.textSize === 'maximum' ? 1.5 :
                     config.textSize === 'extra-large' ? 1.3 :
                     config.textSize === 'large' ? 1.2 : 1.0;

    return {
      small: baseSpacing * 0.5 * multiplier,
      medium: baseSpacing * multiplier,
      large: baseSpacing * 1.5 * multiplier,
      extraLarge: baseSpacing * 2 * multiplier,
    };
  };

  const spacing = getAdaptiveSpacing();

  // Get text sizes
  const titleSize = variant === 'emergency' || isEmergencyMode
    ? getTextSize('emergency')
    : getTextSize('title');
  const subtitleSize = getTextSize('large');

  // Get container styles based on variant
  const getContainerStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      backgroundColor: colors.background,
    };

    if (variant === 'emergency' || isEmergencyMode) {
      return {
        ...baseStyles,
        backgroundColor: colors.emergency + '10',
        borderWidth: 2,
        borderColor: colors.emergency,
        borderRadius: spacing.medium,
      };
    }

    if (variant === 'card') {
      return {
        ...baseStyles,
        borderRadius: spacing.medium,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.border,
      };
    }

    if (variant === 'screen') {
      return {
        ...baseStyles,
        flex: 1,
      };
    }

    return baseStyles;
  };

  const getPaddingStyles = (): ViewStyle => {
    if (!padding) return {};

    return {
      padding: variant === 'screen' ? spacing.large : spacing.medium,
    };
  };

  const containerStyles = [
    getContainerStyles(),
    getPaddingStyles(),
    style,
  ];

  const titleStyles = [
    styles.title,
    {
      fontSize: titleSize,
      color: variant === 'emergency' || isEmergencyMode ? colors.emergency : colors.foreground,
      marginBottom: subtitle ? spacing.small : spacing.medium,
      lineHeight: titleSize * 1.3,
    },
    titleStyle,
  ];

  const subtitleStyles = [
    styles.subtitle,
    {
      fontSize: subtitleSize,
      color: colors.foreground + 'CC',
      marginBottom: spacing.medium,
      lineHeight: subtitleSize * 1.3,
    },
    subtitleStyle,
  ];

  const contentStyles = [
    {
      flex: scrollable ? 1 : undefined,
    },
    contentStyle,
  ];

  const renderContent = () => (
    <View style={contentStyles}>
      {title && (
        <Text
          style={titleStyles}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={variant === 'screen' ? 1 : 2}
          adjustsFontSizeToFit={false}
          numberOfLines={undefined}
        >
          {title}
        </Text>
      )}

      {subtitle && (
        <Text
          style={subtitleStyles}
          accessible={true}
          accessibilityRole="text"
          adjustsFontSizeToFit={false}
          numberOfLines={undefined}
        >
          {subtitle}
        </Text>
      )}

      {children}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={containerStyles}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        accessible={false}
        testID={testID ? `${testID}-scroll` : undefined}
      >
        {renderContent()}
      </ScrollView>
    );
  }

  return (
    <View
      style={containerStyles}
      accessible={false}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
};

// Higher-order component for automatic large text wrapping
export interface WithLargeTextProps {
  enableLargeText?: boolean;
  largeTextVariant?: LargeTextModeProps['variant'];
}

export function withLargeText<T extends object>(
  Component: React.ComponentType<T>
): React.ComponentType<T & WithLargeTextProps> {
  return function WrappedComponent({
    enableLargeText = true,
    largeTextVariant = 'section',
    ...props
  }: T & WithLargeTextProps) {
    const { config } = useAccessibility();

    if (enableLargeText && (config.textSize === 'large' || config.textSize === 'extra-large' || config.textSize === 'maximum')) {
      return (
        <LargeTextMode variant={largeTextVariant}>
          <Component {...(props as T)} />
        </LargeTextMode>
      );
    }

    return <Component {...(props as T)} />;
  };
}

// Adaptive text component that automatically scales
export interface AdaptiveTextProps {
  children: string | ReactNode;
  variant?: 'small' | 'normal' | 'large' | 'title' | 'button' | 'emergency';
  style?: TextStyle;
  maxLines?: number;
  adjustsFontSizeToFit?: boolean;
  accessible?: boolean;
  accessibilityRole?: 'text' | 'header';
  accessibilityLevel?: number;
  testID?: string;
}

export const AdaptiveText: React.FC<AdaptiveTextProps> = ({
  children,
  variant = 'normal',
  style,
  maxLines,
  adjustsFontSizeToFit = false,
  accessible = true,
  accessibilityRole = 'text',
  accessibilityLevel,
  testID,
}) => {
  const { colors, getTextSize, config } = useAccessibility();

  const fontSize = getTextSize(variant);
  const lineHeight = fontSize * 1.3;

  const textStyles = [
    {
      fontSize,
      lineHeight,
      color: colors.foreground,
    },
    style,
  ];

  return (
    <Text
      style={textStyles}
      numberOfLines={maxLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit && config.textSize !== 'maximum'}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLevel={accessibilityLevel}
      testID={testID}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
  },
});