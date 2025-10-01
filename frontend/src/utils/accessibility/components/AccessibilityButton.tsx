/**
 * Accessibility-Enhanced Button Component
 * Provides accessible button with proper touch targets, haptic feedback, and voice guidance
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  AccessibilityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAccessibility } from '../useAccessibility';
import { hapticFeedback } from '../HapticFeedback';
import { voiceGuidance } from '../VoiceGuidance';

export interface AccessibilityButtonProps extends AccessibilityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'emergency' | 'medication' | 'navigation';
  size?: 'small' | 'medium' | 'large' | 'emergency';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  hapticType?: 'light' | 'medium' | 'heavy';
  voiceGuidance?: boolean;
  emergencyAccess?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const AccessibilityButton: React.FC<AccessibilityButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  hapticType = 'medium',
  voiceGuidance: enableVoiceGuidance = true,
  emergencyAccess = false,
  style,
  textStyle,
  testID,
  accessible = true,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  ...accessibilityProps
}) => {
  const {
    colors,
    getTouchTargetSize,
    getTextSize,
    isEmergencyMode,
    isHapticFeedbackEnabled,
    isVoiceGuidanceEnabled,
  } = useAccessibility();

  const handlePress = useCallback(async () => {
    if (disabled || loading) return;

    // Provide haptic feedback
    if (isHapticFeedbackEnabled) {
      if (variant === 'emergency' || emergencyAccess) {
        await hapticFeedback.emergencyAlert();
      } else {
        await hapticFeedback.trigger({
          type: 'button',
          intensity: hapticType,
        });
      }
    }

    // Provide voice guidance
    if (enableVoiceGuidance && isVoiceGuidanceEnabled) {
      const actionText = emergencyAccess ? `Emergency: ${title}` : `Activated ${title}`;
      await voiceGuidance.speak({
        text: actionText,
        priority: emergencyAccess ? 'emergency' : 'normal',
        interrupt: emergencyAccess,
      });
    }

    // Execute the actual press handler
    onPress();
  }, [
    disabled,
    loading,
    variant,
    emergencyAccess,
    isHapticFeedbackEnabled,
    hapticType,
    enableVoiceGuidance,
    isVoiceGuidanceEnabled,
    title,
    onPress,
  ]);

  // Calculate size based on accessibility settings
  const getButtonSize = useCallback(() => {
    const baseSize = size === 'emergency' || isEmergencyMode ? 'emergency' : size;
    const touchTarget = getTouchTargetSize(
      baseSize === 'small' ? 'minimum' :
      baseSize === 'large' || baseSize === 'emergency' ? 'large' :
      'recommended'
    );

    return {
      minHeight: touchTarget,
      minWidth: touchTarget,
      paddingHorizontal: touchTarget * 0.3,
      paddingVertical: touchTarget * 0.2,
    };
  }, [size, isEmergencyMode, getTouchTargetSize]);

  // Calculate text size
  const getButtonTextSize = useCallback(() => {
    if (variant === 'emergency' || emergencyAccess || isEmergencyMode) {
      return getTextSize('emergency');
    }

    switch (size) {
      case 'small':
        return getTextSize('small');
      case 'large':
        return getTextSize('large');
      default:
        return getTextSize('button');
    }
  }, [variant, emergencyAccess, isEmergencyMode, size, getTextSize]);

  // Get variant-specific colors
  const getVariantColors = useCallback(() => {
    const isEmergencyVariant = variant === 'emergency' || emergencyAccess || isEmergencyMode;

    if (disabled) {
      return {
        background: colors.border,
        text: colors.foreground + '60',
        border: colors.border,
      };
    }

    switch (variant) {
      case 'emergency':
        return {
          background: colors.emergency,
          text: colors.background,
          border: colors.emergency,
        };
      case 'medication':
        return {
          background: colors.success,
          text: colors.background,
          border: colors.success,
        };
      case 'navigation':
        return {
          background: colors.secondary,
          text: colors.background,
          border: colors.secondary,
        };
      case 'secondary':
        return {
          background: colors.background,
          text: colors.primary,
          border: colors.primary,
        };
      default: // primary
        return {
          background: isEmergencyVariant ? colors.emergency : colors.primary,
          text: colors.background,
          border: isEmergencyVariant ? colors.emergency : colors.primary,
        };
    }
  }, [variant, emergencyAccess, isEmergencyMode, disabled, colors]);

  const buttonSize = getButtonSize();
  const textSize = getButtonTextSize();
  const variantColors = getVariantColors();

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: variantColors.background,
      borderColor: variantColors.border,
      ...buttonSize,
    },
    disabled && styles.disabled,
    style,
  ];

  const buttonTextStyles = [
    styles.buttonText,
    {
      color: variantColors.text,
      fontSize: textSize,
    },
    textStyle,
  ];

  const computedAccessibilityLabel =
    accessibilityLabel ||
    `${title}${emergencyAccess ? ' emergency button' : ' button'}`;

  const computedAccessibilityHint =
    accessibilityHint ||
    `${emergencyAccess ? 'Emergency action. ' : ''}Double tap to activate${disabled ? '. Currently disabled' : ''}`;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled || loading}
      accessible={accessible}
      accessibilityLabel={computedAccessibilityLabel}
      accessibilityHint={computedAccessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      testID={testID || `accessibility-button-${variant}-${title.toLowerCase().replace(/\s+/g, '-')}`}
      {...accessibilityProps}
    >
      <View style={styles.buttonContent}>
        {icon && (
          <View style={styles.iconContainer}>
            {icon}
          </View>
        )}
        <Text
          style={buttonTextStyles}
          numberOfLines={2}
          adjustsFontSizeToFit
          accessible={false} // Handled by parent TouchableOpacity
        >
          {loading ? 'Loading...' : title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
});