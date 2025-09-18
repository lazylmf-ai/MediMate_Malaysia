/**
 * Voice Guided Navigation Component
 * Provides voice-guided navigation assistance for elderly users
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useNavigation, useNavigationState, useFocusEffect } from '@react-navigation/native';
import { AccessibilityButton } from './AccessibilityButton';
import { AdaptiveText } from './LargeTextMode';
import { useAccessibility } from '../useAccessibility';
import { voiceGuidance } from '../VoiceGuidance';
import { hapticFeedback } from '../HapticFeedback';

export interface VoiceGuidedNavigationProps {
  screenName?: string;
  screenDescription?: string;
  availableActions?: NavigationAction[];
  autoAnnounce?: boolean;
  showNavigationHelp?: boolean;
  culturalContext?: 'malaysian' | 'islamic' | 'chinese' | 'indian';
  testID?: string;
}

export interface NavigationAction {
  id: string;
  title: string;
  description: string;
  action: () => void;
  route?: string;
  priority: 'high' | 'medium' | 'low';
}

export const VoiceGuidedNavigation: React.FC<VoiceGuidedNavigationProps> = ({
  screenName,
  screenDescription,
  availableActions = [],
  autoAnnounce = true,
  showNavigationHelp = true,
  culturalContext = 'malaysian',
  testID,
}) => {
  const navigation = useNavigation();
  const navigationState = useNavigationState(state => state);
  const {
    isVoiceGuidanceEnabled,
    config,
    colors,
  } = useAccessibility();

  const [hasAnnouncedScreen, setHasAnnouncedScreen] = useState(false);
  const [isNavigationHelpVisible, setIsNavigationHelpVisible] = useState(false);

  // Screen announcement on focus
  useFocusEffect(
    useCallback(() => {
      if (autoAnnounce && isVoiceGuidanceEnabled && !hasAnnouncedScreen) {
        announceScreen();
        setHasAnnouncedScreen(true);
      }

      // Reset announcement flag when leaving screen
      return () => {
        setHasAnnouncedScreen(false);
      };
    }, [autoAnnounce, isVoiceGuidanceEnabled, hasAnnouncedScreen])
  );

  // App state change handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isVoiceGuidanceEnabled) {
        // Re-announce screen when app becomes active
        setTimeout(() => {
          announceScreen();
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isVoiceGuidanceEnabled]);

  const announceScreen = useCallback(async () => {
    if (!isVoiceGuidanceEnabled) return;

    const currentRouteName = screenName || getCurrentRouteName();
    const announcement = buildScreenAnnouncement(currentRouteName, screenDescription);

    await voiceGuidance.speak({
      text: announcement,
      priority: 'normal',
      interrupt: false,
    });

    // Announce available actions after a brief pause
    if (availableActions.length > 0) {
      setTimeout(async () => {
        await announceAvailableActions();
      }, 2000);
    }
  }, [isVoiceGuidanceEnabled, screenName, screenDescription, availableActions]);

  const getCurrentRouteName = useCallback((): string => {
    if (!navigationState) return 'Unknown Screen';

    const route = navigationState.routes[navigationState.index];
    return route?.name || 'Unknown Screen';
  }, [navigationState]);

  const buildScreenAnnouncement = useCallback((routeName: string, description?: string): string => {
    const greetings = {
      malaysian: 'You are now on',
      islamic: 'Anda kini berada di',
      chinese: '您现在在',
      indian: 'நீங்கள் இப்போது இருக்கிறீர்கள்',
    };

    const greeting = greetings[culturalContext] || greetings.malaysian;
    const screenTitle = formatScreenName(routeName);

    let announcement = `${greeting} ${screenTitle} screen.`;

    if (description) {
      announcement += ` ${description}`;
    }

    // Add navigation tip for first-time users
    if (config.autoFocus) {
      announcement += ' Double tap on any button to activate it. Swipe left or right to navigate between elements.';
    }

    return announcement;
  }, [culturalContext, config.autoFocus]);

  const formatScreenName = useCallback((routeName: string): string => {
    // Convert screen names to user-friendly format
    const nameMap: Record<string, string> = {
      'HomeScreen': 'Home',
      'MedicationsScreen': 'Medications',
      'ProfileScreen': 'Profile',
      'FamilyScreen': 'Family',
      'MedicationEntryScreen': 'Add Medication',
      'MedicationCalendarScreen': 'Medication Calendar',
      'ProgressOverview': 'Progress Overview',
      'CaregiverDashboard': 'Caregiver Dashboard',
      'EmergencyContactManagement': 'Emergency Contacts',
      'LoginScreen': 'Login',
      'RegisterScreen': 'Registration',
    };

    return nameMap[routeName] || routeName.replace(/([A-Z])/g, ' $1').trim();
  }, []);

  const announceAvailableActions = useCallback(async () => {
    if (!isVoiceGuidanceEnabled || availableActions.length === 0) return;

    const highPriorityActions = availableActions
      .filter(action => action.priority === 'high')
      .slice(0, 3);

    if (highPriorityActions.length > 0) {
      const actionsList = highPriorityActions
        .map(action => action.title)
        .join(', ');

      await voiceGuidance.speak({
        text: `Available actions: ${actionsList}. Tap the help button for more options.`,
        priority: 'normal',
        interrupt: false,
      });
    }
  }, [isVoiceGuidanceEnabled, availableActions]);

  const handleNavigationHelp = useCallback(async () => {
    await hapticFeedback.buttonPress();
    setIsNavigationHelpVisible(!isNavigationHelpVisible);

    if (isVoiceGuidanceEnabled) {
      if (!isNavigationHelpVisible) {
        await voiceGuidance.speak({
          text: 'Navigation help opened. Here are all available actions on this screen.',
          priority: 'high',
          interrupt: true,
        });

        // Announce all actions
        const allActions = availableActions
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .map(action => `${action.title}: ${action.description}`)
          .join('. ');

        if (allActions) {
          setTimeout(async () => {
            await voiceGuidance.speak({
              text: allActions,
              priority: 'normal',
              interrupt: false,
            });
          }, 1000);
        }
      } else {
        await voiceGuidance.speak({
          text: 'Navigation help closed.',
          priority: 'normal',
          interrupt: false,
        });
      }
    }
  }, [isNavigationHelpVisible, isVoiceGuidanceEnabled, availableActions]);

  const handleActionPress = useCallback(async (action: NavigationAction) => {
    await hapticFeedback.navigationFeedback();

    if (isVoiceGuidanceEnabled) {
      await voiceGuidance.speak({
        text: `Activating ${action.title}`,
        priority: 'normal',
        interrupt: false,
      });
    }

    action.action();
  }, [isVoiceGuidanceEnabled]);

  const handleRepeatAnnouncement = useCallback(async () => {
    await hapticFeedback.buttonPress();
    setHasAnnouncedScreen(false);
    await announceScreen();
  }, [announceScreen]);

  const handleToggleVoiceGuidance = useCallback(async () => {
    await hapticFeedback.voiceGuidanceToggled();

    const newState = !isVoiceGuidanceEnabled;
    // This would typically update the accessibility config
    // accessibilityManager.updateConfig({ voiceGuidance: newState });

    if (newState) {
      await voiceGuidance.speak({
        text: 'Voice guidance enabled. I will now announce screen names and available actions.',
        priority: 'high',
        interrupt: true,
      });
    }
  }, [isVoiceGuidanceEnabled]);

  if (!showNavigationHelp && !isVoiceGuidanceEnabled) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID={testID}>
      {/* Voice Guidance Controls */}
      <View style={styles.voiceControls}>
        <AccessibilityButton
          title="Toggle Voice Guide"
          onPress={handleToggleVoiceGuidance}
          variant={isVoiceGuidanceEnabled ? 'primary' : 'secondary'}
          size="small"
          accessibilityLabel={`${isVoiceGuidanceEnabled ? 'Disable' : 'Enable'} voice guidance`}
          accessibilityHint="Controls whether the app speaks screen names and instructions"
          testID="voice-guidance-toggle"
        />

        {isVoiceGuidanceEnabled && (
          <AccessibilityButton
            title="Repeat"
            onPress={handleRepeatAnnouncement}
            variant="secondary"
            size="small"
            accessibilityLabel="Repeat screen announcement"
            accessibilityHint="Speaks the current screen name and description again"
            testID="repeat-announcement"
          />
        )}
      </View>

      {/* Navigation Help */}
      {showNavigationHelp && (
        <View style={styles.helpSection}>
          <AccessibilityButton
            title={isNavigationHelpVisible ? 'Hide Help' : 'Show Help'}
            onPress={handleNavigationHelp}
            variant="navigation"
            size="medium"
            accessibilityLabel={`${isNavigationHelpVisible ? 'Hide' : 'Show'} navigation help`}
            accessibilityHint="Shows available actions and navigation options for this screen"
            testID="navigation-help-toggle"
          />

          {isNavigationHelpVisible && (
            <View style={styles.helpContent}>
              <AdaptiveText variant="large" style={styles.helpTitle}>
                Available Actions
              </AdaptiveText>

              {availableActions.map((action) => (
                <View key={action.id} style={styles.actionItem}>
                  <AccessibilityButton
                    title={action.title}
                    onPress={() => handleActionPress(action)}
                    variant="secondary"
                    size="medium"
                    accessibilityLabel={action.title}
                    accessibilityHint={action.description}
                    testID={`action-${action.id}`}
                  />
                  <AdaptiveText variant="small" style={styles.actionDescription}>
                    {action.description}
                  </AdaptiveText>
                </View>
              ))}

              {availableActions.length === 0 && (
                <AdaptiveText variant="normal" style={styles.noActions}>
                  No additional actions available on this screen.
                </AdaptiveText>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  voiceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  helpSection: {
    marginTop: 8,
  },
  helpContent: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  helpTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D9A',
  },
  actionDescription: {
    marginTop: 4,
    opacity: 0.7,
  },
  noActions: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.6,
  },
});