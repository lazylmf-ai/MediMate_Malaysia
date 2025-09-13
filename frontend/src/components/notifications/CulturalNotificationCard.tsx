/**
 * Cultural Notification Card Component
 * 
 * Displays notifications with cultural themes, colors, and styling
 * based on user language and cultural preferences from Issue #23.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCulturalTheme } from '../language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import type { SupportedLanguage } from '@/i18n/translations';

const { width: screenWidth } = Dimensions.get('window');

export interface CulturalNotificationData {
  id: string;
  title: string;
  body: string;
  language: SupportedLanguage;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reminderType: 'medication' | 'adherence_check' | 'emergency' | 'family_alert';
  timestamp: Date;
  
  // Cultural customizations
  culturalContext?: {
    includeTraditionalSymbols?: boolean;
    useRespectfulTone?: boolean;
    adaptForElderly?: boolean;
    showFamilyContext?: boolean;
  };
  
  // Visual preferences
  visualPreferences?: {
    showIcon?: boolean;
    iconName?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    backgroundColor?: string;
    borderColor?: string;
  };
  
  // Interaction data
  medicationId?: string;
  actionButtons?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  id: string;
  label: string;
  labelTranslations?: Record<SupportedLanguage, string>;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
}

interface CulturalNotificationCardProps {
  notification: CulturalNotificationData;
  onTap?: (notification: CulturalNotificationData) => void;
  onDismiss?: (notification: CulturalNotificationData) => void;
  onAction?: (notification: CulturalNotificationData, action: NotificationAction) => void;
  style?: any;
  animatedValue?: Animated.Value;
}

export const CulturalNotificationCard: React.FC<CulturalNotificationCardProps> = ({
  notification,
  onTap,
  onDismiss,
  onAction,
  style,
  animatedValue
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { currentLanguage, t } = useTranslation();

  // Animation setup
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Get cultural styling based on notification
  const getCulturalStyling = () => {
    const baseColors = {
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      background: theme.colors.surface,
      border: theme.colors.border,
      text: theme.colors.text
    };

    // Priority-based color adjustments
    switch (notification.priority) {
      case 'critical':
        return {
          backgroundColor: theme.colors.error + '10',
          borderColor: theme.colors.error,
          borderWidth: 2,
          iconColor: theme.colors.error
        };
      case 'high':
        return {
          backgroundColor: theme.colors.warning + '10',
          borderColor: theme.colors.warning,
          borderWidth: 2,
          iconColor: theme.colors.warning
        };
      case 'medium':
        return {
          backgroundColor: theme.colors.info + '10',
          borderColor: theme.colors.info,
          borderWidth: 1,
          iconColor: theme.colors.info
        };
      case 'low':
        return {
          backgroundColor: baseColors.background,
          borderColor: baseColors.border,
          borderWidth: 1,
          iconColor: theme.colors.textSecondary
        };
      default:
        return {
          backgroundColor: baseColors.background,
          borderColor: baseColors.border,
          borderWidth: 1,
          iconColor: theme.colors.textSecondary
        };
    }
  };

  // Get icon based on reminder type and culture
  const getNotificationIcon = (): keyof typeof Ionicons.glyphMap => {
    if (notification.visualPreferences?.iconName) {
      return notification.visualPreferences.iconName;
    }

    const iconsByType: Record<string, keyof typeof Ionicons.glyphMap> = {
      medication: 'medical',
      adherence_check: 'checkmark-circle',
      emergency: 'warning',
      family_alert: 'people'
    };

    // Cultural icon variations
    if (notification.culturalContext?.includeTraditionalSymbols) {
      const culturalIcons: Record<SupportedLanguage, Record<string, keyof typeof Ionicons.glyphMap>> = {
        en: iconsByType,
        ms: {
          medication: 'leaf',
          adherence_check: 'checkmark-done-circle',
          emergency: 'alert-circle',
          family_alert: 'home'
        },
        zh: {
          medication: 'flower',
          adherence_check: 'happy',
          emergency: 'warning-outline',
          family_alert: 'people-circle'
        },
        ta: {
          medication: 'leaf-outline',
          adherence_check: 'checkmark-circle-outline',
          emergency: 'alert',
          family_alert: 'people-outline'
        }
      };
      
      return culturalIcons[notification.language]?.[notification.reminderType] || 
             iconsByType[notification.reminderType] || 
             'notifications';
    }

    return iconsByType[notification.reminderType] || 'notifications';
  };

  // Get culturally appropriate time display
  const getTimeDisplay = () => {
    const now = new Date();
    const diff = now.getTime() - notification.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) {
      const justNowTranslations = {
        en: 'Just now',
        ms: 'Baru saja',
        zh: '刚刚',
        ta: 'இப்போது தான்'
      };
      return justNowTranslations[notification.language] || justNowTranslations.en;
    } else if (minutes < 60) {
      const minutesTranslations = {
        en: `${minutes}m ago`,
        ms: `${minutes}m lalu`,
        zh: `${minutes}分钟前`,
        ta: `${minutes}நி முன்`
      };
      return minutesTranslations[notification.language] || minutesTranslations.en;
    } else if (hours < 24) {
      const hoursTranslations = {
        en: `${hours}h ago`,
        ms: `${hours}j lalu`,
        zh: `${hours}小时前`,
        ta: `${hours}ம முன்`
      };
      return hoursTranslations[notification.language] || hoursTranslations.en;
    } else {
      return notification.timestamp.toLocaleDateString();
    }
  };

  // Get action button label in current language
  const getActionLabel = (action: NotificationAction) => {
    if (action.labelTranslations && action.labelTranslations[currentLanguage]) {
      return action.labelTranslations[currentLanguage];
    }
    return action.label;
  };

  const culturalStyling = getCulturalStyling();
  const notificationIcon = getNotificationIcon();

  const cardStyles = [
    styles.card,
    {
      backgroundColor: culturalStyling.backgroundColor,
      borderColor: culturalStyling.borderColor,
      borderWidth: culturalStyling.borderWidth,
      borderRadius: theme.borderRadius.lg,
      padding: isElderlyMode ? theme.spacing.lg : theme.spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    style
  ];

  return (
    <Animated.View
      style={[
        cardStyles,
        {
          opacity: animatedValue || fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={() => onTap?.(notification)}
        activeOpacity={0.7}
        style={styles.cardContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconTitleContainer}>
            {notification.visualPreferences?.showIcon !== false && (
              <View style={[
                styles.iconContainer,
                { 
                  backgroundColor: culturalStyling.iconColor + '20',
                  borderRadius: theme.borderRadius.sm 
                }
              ]}>
                <Ionicons
                  name={notificationIcon}
                  size={isElderlyMode ? 28 : 24}
                  color={notification.visualPreferences?.iconColor || culturalStyling.iconColor}
                />
              </View>
            )}
            <View style={styles.titleContainer}>
              <Text style={[
                styles.title,
                {
                  fontSize: isElderlyMode ? 20 : 16,
                  fontFamily: theme.fonts.display,
                  color: theme.colors.text,
                  fontWeight: '600'
                }
              ]}>
                {notification.title}
              </Text>
              <Text style={[
                styles.timestamp,
                {
                  fontSize: isElderlyMode ? 14 : 12,
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.secondary
                }
              ]}>
                {getTimeDisplay()}
              </Text>
            </View>
          </View>

          {/* Dismiss button */}
          {onDismiss && (
            <TouchableOpacity
              onPress={() => onDismiss(notification)}
              style={[styles.dismissButton, { 
                minWidth: theme.accessibility.minimumTouchTarget / 2,
                minHeight: theme.accessibility.minimumTouchTarget / 2
              }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={isElderlyMode ? 24 : 20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Body */}
        <Text style={[
          styles.body,
          {
            fontSize: isElderlyMode ? 18 : 14,
            lineHeight: isElderlyMode ? 26 : 20,
            color: theme.colors.text,
            fontFamily: theme.fonts.primary,
            marginTop: theme.spacing.sm
          }
        ]}>
          {notification.body}
        </Text>

        {/* Action Buttons */}
        {notification.actionButtons && notification.actionButtons.length > 0 && (
          <View style={[styles.actionsContainer, { marginTop: theme.spacing.md }]}>
            {notification.actionButtons.map((action) => {
              const buttonStyleVariant = action.style || 'secondary';
              const buttonColor = {
                primary: theme.colors.primary,
                secondary: theme.colors.secondary,
                danger: theme.colors.error,
                success: theme.colors.success
              }[buttonStyleVariant];

              return (
                <TouchableOpacity
                  key={action.id}
                  onPress={() => {
                    action.action();
                    onAction?.(notification, action);
                  }}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: buttonColor + '20',
                      borderColor: buttonColor,
                      borderWidth: 1,
                      borderRadius: theme.borderRadius.md,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      minHeight: theme.accessibility.minimumTouchTarget,
                      minWidth: isElderlyMode ? 120 : 100
                    }
                  ]}
                >
                  {action.icon && (
                    <Ionicons
                      name={action.icon}
                      size={16}
                      color={buttonColor}
                      style={{ marginRight: theme.spacing.xs }}
                    />
                  )}
                  <Text style={[
                    styles.actionButtonText,
                    {
                      color: buttonColor,
                      fontSize: isElderlyMode ? 16 : 14,
                      fontFamily: theme.fonts.primary,
                      fontWeight: '500'
                    }
                  ]}>
                    {getActionLabel(action)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Cultural context indicator */}
        {notification.culturalContext?.showFamilyContext && (
          <View style={[
            styles.familyIndicator,
            {
              backgroundColor: theme.colors.accent + '20',
              borderRadius: theme.borderRadius.sm,
              padding: theme.spacing.xs,
              marginTop: theme.spacing.sm
            }
          ]}>
            <Ionicons
              name="people"
              size={14}
              color={theme.colors.accent}
              style={{ marginRight: theme.spacing.xs }}
            />
            <Text style={[
              styles.familyIndicatorText,
              {
                color: theme.colors.accent,
                fontSize: 12,
                fontFamily: theme.fonts.secondary
              }
            ]}>
              {currentLanguage === 'ms' ? 'Notifikasi Keluarga' :
               currentLanguage === 'zh' ? '家庭通知' :
               currentLanguage === 'ta' ? 'குடும்ப அறிவிப்பு' :
               'Family Notification'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  dismissButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  familyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  familyIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CulturalNotificationCard;