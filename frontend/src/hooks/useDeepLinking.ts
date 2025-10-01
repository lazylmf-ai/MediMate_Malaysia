/**
 * Deep Linking Hook
 * 
 * Handles deep link parsing, validation, and navigation
 * with cultural context awareness and security checks.
 */

import { useEffect, useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '@/store/hooks';
import {
  DeepLinkParser,
  CulturalDeepLinkValidator,
  DeepLinkAnalytics,
  type CulturalDeepLink,
  type MedicationDeepLink,
  type FamilyDeepLink,
} from '@/navigation/DeepLinkingConfig';

interface DeepLinkState {
  isProcessing: boolean;
  lastProcessedLink: string | null;
  error: string | null;
  pendingLinks: string[];
}

interface UseDeepLinkingResult {
  // State
  state: DeepLinkState;
  
  // Functions
  processDeepLink: (url: string) => Promise<boolean>;
  handleCulturalEventLink: (link: CulturalDeepLink) => Promise<boolean>;
  handleMedicationLink: (link: MedicationDeepLink) => Promise<boolean>;
  handleFamilyLink: (link: FamilyDeepLink) => Promise<boolean>;
  
  // Validation
  validateLink: (url: string) => boolean;
  isSecureLink: (url: string) => boolean;
  
  // Analytics
  getDeepLinkStats: () => any;
  clearStats: () => void;
}

/**
 * Deep Linking Hook
 */
export function useDeepLinking(): UseDeepLinkingResult {
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.cultural);
  const { isOnline } = useAppSelector((state) => state.app);

  const [state, setState] = useState<DeepLinkState>({
    isProcessing: false,
    lastProcessedLink: null,
    error: null,
    pendingLinks: [],
  });

  // Initialize deep linking
  useEffect(() => {
    // Handle app launch from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        processDeepLink(url);
      }
    });

    // Handle deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Process pending links when authentication state changes
  useEffect(() => {
    if (isAuthenticated && state.pendingLinks.length > 0) {
      const pendingLinks = [...state.pendingLinks];
      setState(prev => ({ ...prev, pendingLinks: [] }));
      
      // Process all pending links
      pendingLinks.forEach(link => {
        processDeepLink(link);
      });
    }
  }, [isAuthenticated]);

  const validateLink = useCallback((url: string): boolean => {
    try {
      const urlObj = new URL(url.replace('medimate://', 'https://temp/'));
      
      // Basic URL validation
      if (!urlObj.pathname || urlObj.pathname === '/') {
        return false;
      }

      // Check for suspicious patterns
      if (url.includes('javascript:') || url.includes('<script')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }, []);

  const isSecureLink = useCallback((url: string): boolean => {
    // Check if link requires authentication
    const authRequiredPaths = [
      '/medications',
      '/family',
      '/profile',
    ];

    const urlObj = new URL(url.replace('medimate://', 'https://temp/'));
    
    return authRequiredPaths.some(path => urlObj.pathname.startsWith(path));
  }, []);

  const processDeepLink = useCallback(async (url: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Validate link format
      if (!validateLink(url)) {
        throw new Error('Invalid deep link format');
      }

      // Check authentication requirement
      if (isSecureLink(url) && !isAuthenticated) {
        // Queue link for processing after authentication
        setState(prev => ({
          ...prev,
          pendingLinks: [...prev.pendingLinks, url],
          isProcessing: false,
        }));
        
        // Navigate to login
        navigation.navigate('Auth' as never, { screen: 'Login', params: { returnUrl: url } } as never);
        return false;
      }

      // Parse and handle different link types
      const handled = await handleParsedLink(url);
      
      if (handled) {
        setState(prev => ({
          ...prev,
          lastProcessedLink: url,
          isProcessing: false,
        }));
        
        DeepLinkAnalytics.trackDeepLinkOpen(url, true, { 
          authenticated: isAuthenticated,
          hasProfile: !!profile,
        });
      } else {
        throw new Error('Unable to handle deep link');
      }

      return handled;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isProcessing: false,
      }));

      DeepLinkAnalytics.trackDeepLinkOpen(url, false, { error: errorMessage });
      
      console.error('Deep link processing failed:', error);
      return false;
    }
  }, [validateLink, isSecureLink, isAuthenticated, navigation, profile]);

  const handleParsedLink = useCallback(async (url: string): Promise<boolean> => {
    // Try to parse as cultural event link
    const culturalLink = DeepLinkParser.parseCulturalEventLink(url);
    if (culturalLink) {
      return await handleCulturalEventLink(culturalLink);
    }

    // Try to parse as medication link
    const medicationLink = DeepLinkParser.parseMedicationLink(url);
    if (medicationLink) {
      return await handleMedicationLink(medicationLink);
    }

    // Try to parse as family link
    const familyLink = DeepLinkParser.parseFamilyLink(url);
    if (familyLink) {
      return await handleFamilyLink(familyLink);
    }

    return false;
  }, []);

  const handleCulturalEventLink = useCallback(async (link: CulturalDeepLink): Promise<boolean> => {
    // Validate cultural link
    let isValid = false;
    switch (link.type) {
      case 'prayer_time':
        isValid = CulturalDeepLinkValidator.validatePrayerTimeLink(link);
        break;
      case 'festival':
        isValid = CulturalDeepLinkValidator.validateFestivalLink(link);
        break;
      case 'family_event':
        isValid = CulturalDeepLinkValidator.validateFamilyEventLink(link);
        break;
      case 'cultural_insight':
        isValid = CulturalDeepLinkValidator.validateCulturalInsightLink(link);
        break;
    }

    if (!isValid) {
      throw new Error(`Invalid ${link.type} link`);
    }

    // Track cultural navigation
    DeepLinkAnalytics.trackCulturalEventNavigation(link);

    // Navigate based on link type
    switch (link.type) {
      case 'prayer_time':
        navigation.navigate('Main' as never, {
          screen: 'Home',
          params: {
            screen: 'PrayerTimes',
            params: {
              prayer: link.data.prayerName,
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'festival':
        navigation.navigate('Main' as never, {
          screen: 'Home',
          params: {
            screen: 'CulturalInsights',
            params: {
              festival: link.data.festivalName,
              context: link.data.culturalContext,
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'family_event':
        navigation.navigate('Main' as never, {
          screen: 'Family',
          params: {
            screen: 'FamilyMember',
            params: {
              memberId: link.data.familyMemberId,
              eventId: link.data.eventId,
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'cultural_insight':
        navigation.navigate('Main' as never, {
          screen: 'Home',
          params: {
            screen: 'CulturalInsights',
            params: {
              insightId: link.data.eventId,
              context: link.data.culturalContext,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;
    }

    return false;
  }, [navigation]);

  const handleMedicationLink = useCallback(async (link: MedicationDeepLink): Promise<boolean> => {
    // Track medication navigation
    DeepLinkAnalytics.trackMedicationNavigation(link);

    // Navigate based on link type
    switch (link.type) {
      case 'reminder':
        navigation.navigate('Main' as never, {
          screen: 'Medications',
          params: {
            screen: 'MedicationReminder',
            params: {
              reminderId: link.data.reminderId,
              action: link.action,
              familyMemberId: link.data.familyMemberId,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'schedule':
        navigation.navigate('Main' as never, {
          screen: 'Medications',
          params: {
            screen: 'MedicationSchedule',
            params: {
              medicationId: link.data.medicationId,
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'emergency':
        navigation.navigate('Main' as never, {
          screen: 'Medications',
          params: {
            screen: 'MedicationDetails',
            params: {
              medicationId: link.data.medicationId,
              emergency: link.data.emergencyType,
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'adherence':
        navigation.navigate('Main' as never, {
          screen: 'Family',
          params: {
            screen: 'FamilyMedications',
            params: {
              memberId: link.data.familyMemberId,
              view: 'adherence',
              fromDeepLink: true,
            },
          },
        } as never);
        return true;
    }

    return false;
  }, [navigation]);

  const handleFamilyLink = useCallback(async (link: FamilyDeepLink): Promise<boolean> => {
    // Track family navigation
    DeepLinkAnalytics.trackFamilyNavigation(link);

    // Navigate based on link type
    switch (link.type) {
      case 'dashboard':
        navigation.navigate('Main' as never, {
          screen: 'Family',
          params: {
            screen: 'FamilyDashboard',
            params: {
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'member':
        navigation.navigate('Main' as never, {
          screen: 'Family',
          params: {
            screen: 'FamilyMember',
            params: {
              memberId: link.data.familyMemberId,
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'emergency':
        navigation.navigate('Main' as never, {
          screen: 'Family',
          params: {
            screen: 'FamilyEmergency',
            params: {
              type: link.data.emergencyType,
              memberId: link.data.familyMemberId,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;

      case 'medication_status':
        navigation.navigate('Main' as never, {
          screen: 'Family',
          params: {
            screen: 'FamilyMedications',
            params: {
              memberId: link.data.familyMemberId,
              status: link.data.medicationStatus,
              action: link.action,
              fromDeepLink: true,
            },
          },
        } as never);
        return true;
    }

    return false;
  }, [navigation]);

  const getDeepLinkStats = useCallback(() => {
    return {
      lastProcessedLink: state.lastProcessedLink,
      pendingLinksCount: state.pendingLinks.length,
      isProcessing: state.isProcessing,
      hasError: !!state.error,
      error: state.error,
    };
  }, [state]);

  const clearStats = useCallback(() => {
    setState({
      isProcessing: false,
      lastProcessedLink: null,
      error: null,
      pendingLinks: [],
    });
  }, []);

  return {
    state,
    processDeepLink,
    handleCulturalEventLink,
    handleMedicationLink,
    handleFamilyLink,
    validateLink,
    isSecureLink,
    getDeepLinkStats,
    clearStats,
  };
}

/**
 * Simplified Deep Linking Hook for Cultural Events
 */
export function useCulturalDeepLinking() {
  const { handleCulturalEventLink, processDeepLink, state } = useDeepLinking();
  
  return {
    handleCulturalEventLink,
    processDeepLink,
    isProcessing: state.isProcessing,
    error: state.error,
  };
}

/**
 * Simplified Deep Linking Hook for Medication Features
 */
export function useMedicationDeepLinking() {
  const { handleMedicationLink, processDeepLink, state } = useDeepLinking();
  
  return {
    handleMedicationLink,
    processDeepLink,
    isProcessing: state.isProcessing,
    error: state.error,
  };
}