/**
 * Navigation Guards
 * 
 * Cultural-aware navigation guards that protect routes based on
 * authentication status, cultural profile completion, and family roles.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAppSelector } from '@/store/hooks';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { CulturalProfile } from '@/types/cultural';
import type { User } from '@/types/auth';

export interface NavigationGuardConfig {
  requiresAuth: boolean;
  requiredProfile?: 'basic' | 'cultural' | 'family';
  culturalContext?: string[];
  familyRole?: 'member' | 'caregiver' | 'admin';
  prayerTimeAware?: boolean;
  emergencyBypass?: boolean;
  offlineAccessible?: boolean;
}

export interface NavigationGuardProps {
  config: NavigationGuardConfig;
  children: React.ReactNode;
  fallbackRoute?: string;
  loadingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: string; retry: () => void }>;
}

/**
 * Higher-Order Component for Navigation Guards
 */
export function withNavigationGuard(
  Component: React.ComponentType<any>,
  guardConfig: NavigationGuardConfig
) {
  return function GuardedComponent(props: any) {
    return (
      <NavigationGuard config={guardConfig}>
        <Component {...props} />
      </NavigationGuard>
    );
  };
}

/**
 * Navigation Guard Component
 */
export function NavigationGuard({
  config,
  children,
  fallbackRoute = 'Auth',
  loadingComponent: LoadingComponent = DefaultLoadingComponent,
  errorComponent: ErrorComponent = DefaultErrorComponent,
}: NavigationGuardProps) {
  const navigation = useNavigation();
  const { isAuthenticated, user, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const { profile, isLoading: culturalLoading } = useAppSelector((state) => state.cultural);
  const { isOnline } = useAppSelector((state) => state.app);

  const [guardStatus, setGuardStatus] = useState<{
    status: 'checking' | 'allowed' | 'denied';
    reason?: string;
  }>({ status: 'checking' });

  useEffect(() => {
    evaluateNavigationGuard();
  }, [isAuthenticated, user, profile, isOnline]);

  const evaluateNavigationGuard = async () => {
    try {
      // Check authentication requirement
      if (config.requiresAuth && !isAuthenticated) {
        setGuardStatus({ status: 'denied', reason: 'authentication_required' });
        redirectToFallback();
        return;
      }

      // Check offline accessibility
      if (!config.offlineAccessible && !isOnline) {
        setGuardStatus({ status: 'denied', reason: 'network_required' });
        return;
      }

      // Check profile requirements
      if (config.requiredProfile && !checkProfileRequirements(user, profile, config.requiredProfile)) {
        setGuardStatus({ status: 'denied', reason: 'profile_incomplete' });
        redirectToProfileCompletion(config.requiredProfile);
        return;
      }

      // Check cultural context requirements
      if (config.culturalContext && !checkCulturalContext(profile, config.culturalContext)) {
        setGuardStatus({ status: 'denied', reason: 'cultural_context_missing' });
        redirectToCulturalSetup();
        return;
      }

      // Check family role requirements
      if (config.familyRole && !checkFamilyRole(user, profile, config.familyRole)) {
        setGuardStatus({ status: 'denied', reason: 'insufficient_family_role' });
        redirectToFamilySetup();
        return;
      }

      // Check prayer time awareness
      if (config.prayerTimeAware && !checkPrayerTimeSetup(profile)) {
        setGuardStatus({ status: 'denied', reason: 'prayer_time_setup_required' });
        redirectToPrayerTimeSetup();
        return;
      }

      // All checks passed
      setGuardStatus({ status: 'allowed' });
    } catch (error) {
      console.error('Navigation guard evaluation failed:', error);
      setGuardStatus({ status: 'denied', reason: 'evaluation_error' });
    }
  };

  const checkProfileRequirements = (
    user: User | null,
    profile: CulturalProfile | null,
    required: string
  ): boolean => {
    if (!user) return false;

    switch (required) {
      case 'basic':
        return !!user.id && !!user.email;
      
      case 'cultural':
        return !!profile && !!profile.language && !!profile.timezone;
      
      case 'family':
        return !!profile?.familyStructure && 
               (profile.familyStructure.elderlyMembers > 0 || 
                profile.familyStructure.children.length > 0 ||
                profile.familyStructure.primaryCaregiver);
      
      default:
        return true;
    }
  };

  const checkCulturalContext = (
    profile: CulturalProfile | null,
    requiredContexts: string[]
  ): boolean => {
    if (!profile) return false;

    return requiredContexts.every(context => {
      switch (context) {
        case 'language':
          return !!profile.language;
        
        case 'prayer_times':
          return !!profile.prayerTimes?.enabled;
        
        case 'festivals':
          return Object.values(profile.festivals || {}).some(enabled => enabled);
        
        case 'family_structure':
          return !!profile.familyStructure;
        
        default:
          return true;
      }
    });
  };

  const checkFamilyRole = (
    user: User | null,
    profile: CulturalProfile | null,
    requiredRole: string
  ): boolean => {
    if (!user || !profile) return false;

    // For now, assume all users are caregivers
    // This will be enhanced with proper family role management
    switch (requiredRole) {
      case 'member':
        return true; // All authenticated users are family members
      
      case 'caregiver':
        return !!profile.familyStructure?.primaryCaregiver;
      
      case 'admin':
        return !!profile.familyStructure?.primaryCaregiver; // For now, caregivers are admins
      
      default:
        return true;
    }
  };

  const checkPrayerTimeSetup = (profile: CulturalProfile | null): boolean => {
    if (!profile) return false;
    return !!profile.prayerTimes?.enabled && !!profile.timezone;
  };

  const redirectToFallback = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: fallbackRoute }],
      })
    );
  };

  const redirectToProfileCompletion = (profileType: string) => {
    const routes = {
      basic: 'Profile',
      cultural: 'CulturalSettings',
      family: 'FamilyStructure',
    };

    navigation.dispatch(
      CommonActions.navigate('Main', {
        screen: 'Profile',
        params: {
          screen: routes[profileType as keyof typeof routes] || 'ProfileMain',
        },
      })
    );
  };

  const redirectToCulturalSetup = () => {
    navigation.dispatch(
      CommonActions.navigate('Main', {
        screen: 'Profile',
        params: {
          screen: 'CulturalSettings',
        },
      })
    );
  };

  const redirectToFamilySetup = () => {
    navigation.dispatch(
      CommonActions.navigate('Main', {
        screen: 'Profile',
        params: {
          screen: 'FamilyStructure',
        },
      })
    );
  };

  const redirectToPrayerTimeSetup = () => {
    navigation.dispatch(
      CommonActions.navigate('Main', {
        screen: 'Profile',
        params: {
          screen: 'PrayerTimeSettings',
        },
      })
    );
  };

  // Show loading while checking guards
  if (authLoading || culturalLoading || guardStatus.status === 'checking') {
    return <LoadingComponent />;
  }

  // Show error if guard denied
  if (guardStatus.status === 'denied') {
    return (
      <ErrorComponent
        error={guardStatus.reason || 'access_denied'}
        retry={evaluateNavigationGuard}
      />
    );
  }

  // Render children if allowed
  return <>{children}</>;
}

/**
 * Default Loading Component
 */
function DefaultLoadingComponent() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Checking access...</Text>
    </View>
  );
}

/**
 * Default Error Component
 */
function DefaultErrorComponent({ error, retry }: { error: string; retry: () => void }) {
  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'authentication_required':
        return 'Please log in to access this feature';
      
      case 'profile_incomplete':
        return 'Please complete your profile to continue';
      
      case 'cultural_context_missing':
        return 'Cultural settings are required for this feature';
      
      case 'insufficient_family_role':
        return 'You do not have permission to access this feature';
      
      case 'prayer_time_setup_required':
        return 'Prayer time settings are required for this feature';
      
      case 'network_required':
        return 'This feature requires an internet connection';
      
      default:
        return 'Access denied. Please check your permissions.';
    }
  };

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Access Restricted</Text>
      <Text style={styles.errorMessage}>{getErrorMessage(error)}</Text>
      <Text style={styles.retryText} onPress={retry}>
        Try Again
      </Text>
    </View>
  );
}

/**
 * Pre-configured Guard Configs
 */
export const NavigationGuardConfigs = {
  // Basic authentication required
  authenticated: {
    requiresAuth: true,
  } as NavigationGuardConfig,

  // Cultural profile required
  culturalRequired: {
    requiresAuth: true,
    requiredProfile: 'cultural',
    culturalContext: ['language'],
  } as NavigationGuardConfig,

  // Family features
  familyRequired: {
    requiresAuth: true,
    requiredProfile: 'family',
    culturalContext: ['family_structure'],
    familyRole: 'caregiver',
  } as NavigationGuardConfig,

  // Prayer time aware features
  prayerTimeAware: {
    requiresAuth: true,
    requiredProfile: 'cultural',
    culturalContext: ['prayer_times'],
    prayerTimeAware: true,
  } as NavigationGuardConfig,

  // Emergency accessible features
  emergencyAccess: {
    requiresAuth: true,
    emergencyBypass: true,
    offlineAccessible: true,
  } as NavigationGuardConfig,

  // Offline accessible features
  offlineCapable: {
    requiresAuth: true,
    offlineAccessible: true,
  } as NavigationGuardConfig,
};

/**
 * Guard Hook for Components
 */
export function useNavigationGuard(config: NavigationGuardConfig) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.cultural);
  const { isOnline } = useAppSelector((state) => state.app);

  const [canAccess, setCanAccess] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = () => {
      // Authentication check
      if (config.requiresAuth && !isAuthenticated) {
        setCanAccess(false);
        setReason('authentication_required');
        return;
      }

      // Offline check
      if (!config.offlineAccessible && !isOnline) {
        setCanAccess(false);
        setReason('network_required');
        return;
      }

      // All other checks would go here...
      setCanAccess(true);
      setReason(null);
    };

    checkAccess();
  }, [isAuthenticated, user, profile, isOnline, config]);

  return { canAccess, reason };
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});