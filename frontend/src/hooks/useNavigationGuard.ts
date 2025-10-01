/**
 * Navigation Guard Hook
 * 
 * Provides navigation guard functionality with cultural context awareness
 * and automatic redirect handling.
 */

import { useEffect, useState } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAppSelector } from '@/store/hooks';
import type { NavigationGuardConfig } from '@/navigation/NavigationGuards';

interface UseNavigationGuardResult {
  canAccess: boolean;
  reason: string | null;
  isLoading: boolean;
  retry: () => void;
  navigate: (route: string, params?: any) => void;
}

/**
 * Navigation Guard Hook
 */
export function useNavigationGuard(config: NavigationGuardConfig): UseNavigationGuardResult {
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.cultural);
  const { isOnline } = useAppSelector((state) => state.app);

  const [canAccess, setCanAccess] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAccess = async () => {
    setIsLoading(true);
    
    try {
      // Authentication check
      if (config.requiresAuth && !isAuthenticated) {
        setCanAccess(false);
        setReason('authentication_required');
        setIsLoading(false);
        return;
      }

      // Offline accessibility check
      if (!config.offlineAccessible && !isOnline) {
        setCanAccess(false);
        setReason('network_required');
        setIsLoading(false);
        return;
      }

      // Profile requirements check
      if (config.requiredProfile) {
        const hasRequiredProfile = checkProfileRequirements(config.requiredProfile);
        if (!hasRequiredProfile) {
          setCanAccess(false);
          setReason('profile_incomplete');
          setIsLoading(false);
          return;
        }
      }

      // Cultural context check
      if (config.culturalContext) {
        const hasCulturalContext = checkCulturalContext(config.culturalContext);
        if (!hasCulturalContext) {
          setCanAccess(false);
          setReason('cultural_context_missing');
          setIsLoading(false);
          return;
        }
      }

      // Family role check
      if (config.familyRole) {
        const hasCorrectRole = checkFamilyRole(config.familyRole);
        if (!hasCorrectRole) {
          setCanAccess(false);
          setReason('insufficient_family_role');
          setIsLoading(false);
          return;
        }
      }

      // Prayer time awareness check
      if (config.prayerTimeAware) {
        const hasPrayerTimeSetup = checkPrayerTimeSetup();
        if (!hasPrayerTimeSetup) {
          setCanAccess(false);
          setReason('prayer_time_setup_required');
          setIsLoading(false);
          return;
        }
      }

      // Emergency bypass
      if (config.emergencyBypass && isEmergencyMode()) {
        setCanAccess(true);
        setReason(null);
        setIsLoading(false);
        return;
      }

      // All checks passed
      setCanAccess(true);
      setReason(null);
    } catch (error) {
      console.error('Navigation guard check failed:', error);
      setCanAccess(false);
      setReason('guard_check_error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkProfileRequirements = (required: string): boolean => {
    if (!user) return false;

    switch (required) {
      case 'basic':
        return !!user.id && !!user.email;
      
      case 'cultural':
        return !!profile && !!profile.language && !!profile.timezone;
      
      case 'family':
        return !!profile?.familyStructure && (
          profile.familyStructure.elderlyMembers > 0 || 
          profile.familyStructure.children.length > 0 ||
          profile.familyStructure.primaryCaregiver
        );
      
      default:
        return true;
    }
  };

  const checkCulturalContext = (requiredContexts: string[]): boolean => {
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

  const checkFamilyRole = (requiredRole: string): boolean => {
    if (!user || !profile) return false;

    switch (requiredRole) {
      case 'member':
        return true; // All authenticated users are family members
      
      case 'caregiver':
        return !!profile.familyStructure?.primaryCaregiver;
      
      case 'admin':
        return !!profile.familyStructure?.primaryCaregiver; // Caregivers are admins for now
      
      default:
        return true;
    }
  };

  const checkPrayerTimeSetup = (): boolean => {
    if (!profile) return false;
    return !!profile.prayerTimes?.enabled && !!profile.timezone;
  };

  const isEmergencyMode = (): boolean => {
    // This would check for emergency mode state
    // For now, return false
    return false;
  };

  const retry = () => {
    checkAccess();
  };

  const navigate = (route: string, params?: any) => {
    navigation.dispatch(
      CommonActions.navigate(route, params)
    );
  };

  useEffect(() => {
    checkAccess();
  }, [isAuthenticated, user, profile, isOnline, JSON.stringify(config)]);

  return {
    canAccess,
    reason,
    isLoading,
    retry,
    navigate,
  };
}

/**
 * Simplified Navigation Guard Hook for Common Cases
 */
export function useAuthGuard() {
  return useNavigationGuard({
    requiresAuth: true,
  });
}

export function useCulturalGuard() {
  return useNavigationGuard({
    requiresAuth: true,
    requiredProfile: 'cultural',
    culturalContext: ['language'],
  });
}

export function useFamilyGuard() {
  return useNavigationGuard({
    requiresAuth: true,
    requiredProfile: 'family',
    culturalContext: ['family_structure'],
    familyRole: 'caregiver',
  });
}

export function usePrayerTimeGuard() {
  return useNavigationGuard({
    requiresAuth: true,
    requiredProfile: 'cultural',
    culturalContext: ['prayer_times'],
    prayerTimeAware: true,
  });
}