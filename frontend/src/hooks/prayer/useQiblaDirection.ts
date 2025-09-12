/**
 * Qibla Direction Hook
 * 
 * React hook for Qibla direction calculation and compass integration:
 * - Real-time Qibla direction calculation
 * - Device orientation integration
 * - Location-based accuracy
 * - Visual compass support
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Location from 'expo-location';
import { PrayerTimeService } from '../../services/prayer-scheduling';
import { useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/culturalSlice';
import { MALAYSIAN_STATES_DATA, MalaysianState } from '../../types/cultural';

export interface QiblaDirectionState {
  qiblaDirection: number | null; // Degrees from North (0-360)
  deviceHeading: number | null; // Current device heading
  relativeQiblaDirection: number | null; // Qibla direction relative to device heading
  accuracy: 'high' | 'medium' | 'low' | 'unknown';
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  };
  isLoading: boolean;
  error: string | null;
  permissions: {
    location: boolean;
    compass: boolean;
  };
}

export interface QiblaDirectionActions {
  refreshLocation: () => Promise<void>;
  startCompass: () => Promise<void>;
  stopCompass: () => void;
  calculateQiblaForLocation: (lat: number, lng: number) => number;
  updateLocationFromState: (state: MalaysianState) => void;
  requestPermissions: () => Promise<boolean>;
  clearError: () => void;
}

export interface UseQiblaDirectionOptions {
  autoStart?: boolean;
  highAccuracy?: boolean;
  updateInterval?: number; // milliseconds
  useStateLocation?: boolean;
  fallbackState?: MalaysianState;
}

export const useQiblaDirection = (
  options: UseQiblaDirectionOptions = {}
): QiblaDirectionState & QiblaDirectionActions => {
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const prayerService = useMemo(() => PrayerTimeService.getInstance(), []);

  const [state, setState] = useState<QiblaDirectionState>({
    qiblaDirection: null,
    deviceHeading: null,
    relativeQiblaDirection: null,
    accuracy: 'unknown',
    location: {
      latitude: null,
      longitude: null,
      accuracy: null
    },
    isLoading: false,
    error: null,
    permissions: {
      location: false,
      compass: false
    }
  });

  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [headingSubscription, setHeadingSubscription] = useState<any>(null);

  // Calculate Qibla direction for given coordinates
  const calculateQiblaForLocation = useCallback((lat: number, lng: number): number => {
    return prayerService.calculateQiblaDirection(lat, lng);
  }, [prayerService]);

  // Update Qibla direction when location or heading changes
  const updateQiblaCalculation = useCallback((latitude: number, longitude: number, heading?: number) => {
    const qiblaDirection = calculateQiblaForLocation(latitude, longitude);
    
    let relativeQiblaDirection: number | null = null;
    if (heading !== undefined && heading !== null) {
      relativeQiblaDirection = (qiblaDirection - heading + 360) % 360;
    }

    setState(prev => ({
      ...prev,
      qiblaDirection,
      deviceHeading: heading || prev.deviceHeading,
      relativeQiblaDirection,
      accuracy: prev.location.accuracy ? getAccuracyLevel(prev.location.accuracy) : 'unknown'
    }));
  }, [calculateQiblaForLocation]);

  // Get location accuracy level
  const getAccuracyLevel = (accuracy: number): 'high' | 'medium' | 'low' | 'unknown' => {
    if (accuracy <= 10) return 'high';
    if (accuracy <= 50) return 'medium';
    if (accuracy <= 100) return 'low';
    return 'unknown';
  };

  // Request necessary permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request location permissions
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      const locationGranted = locationStatus === 'granted';

      // Check if device has compass
      const hasCompass = await Location.hasServicesEnabledAsync();

      setState(prev => ({
        ...prev,
        permissions: {
          location: locationGranted,
          compass: hasCompass
        },
        isLoading: false
      }));

      return locationGranted && hasCompass;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission request failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  // Get current location
  const refreshLocation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!state.permissions.location) {
        const permissionGranted = await requestPermissions();
        if (!permissionGranted) {
          throw new Error('Location permission not granted');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: options.highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
        maximumAge: 60000, // Use cached location if less than 1 minute old
      });

      setState(prev => ({
        ...prev,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        },
        isLoading: false
      }));

      // Calculate Qibla direction
      updateQiblaCalculation(
        location.coords.latitude,
        location.coords.longitude,
        state.deviceHeading
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Location fetch failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      // Fallback to state location if available
      if (options.useStateLocation && culturalPreferences?.location?.state) {
        updateLocationFromState(culturalPreferences.location.state as MalaysianState);
      } else if (options.fallbackState) {
        updateLocationFromState(options.fallbackState);
      }
    }
  }, [state.permissions.location, options, culturalPreferences, requestPermissions, updateQiblaCalculation, state.deviceHeading]);

  // Start compass/heading updates
  const startCompass = useCallback(async () => {
    try {
      if (!state.permissions.compass) {
        const permissionGranted = await requestPermissions();
        if (!permissionGranted) {
          throw new Error('Compass permission not granted');
        }
      }

      // Start heading updates
      const subscription = await Location.watchHeadingAsync((heading) => {
        const deviceHeading = heading.trueHeading || heading.magHeading;
        
        if (state.location.latitude && state.location.longitude) {
          updateQiblaCalculation(
            state.location.latitude,
            state.location.longitude,
            deviceHeading
          );
        } else {
          setState(prev => ({ ...prev, deviceHeading }));
        }
      });

      setHeadingSubscription(subscription);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Compass start failed';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [state.permissions.compass, state.location, requestPermissions, updateQiblaCalculation]);

  // Stop compass updates
  const stopCompass = useCallback(() => {
    if (headingSubscription) {
      headingSubscription.remove();
      setHeadingSubscription(null);
    }

    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }

    setState(prev => ({
      ...prev,
      deviceHeading: null,
      relativeQiblaDirection: null
    }));
  }, [headingSubscription, locationSubscription]);

  // Update location based on Malaysian state
  const updateLocationFromState = useCallback((stateName: MalaysianState) => {
    const stateData = MALAYSIAN_STATES_DATA[stateName];
    if (stateData) {
      const { latitude, longitude } = stateData.coordinates;
      
      setState(prev => ({
        ...prev,
        location: {
          latitude,
          longitude,
          accuracy: 1000 // Large accuracy for state-level location
        },
        accuracy: 'low'
      }));

      updateQiblaCalculation(latitude, longitude, state.deviceHeading);
    }
  }, [updateQiblaCalculation, state.deviceHeading]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      // Request permissions first
      const hasPermissions = await requestPermissions();
      
      if (hasPermissions && options.autoStart) {
        // Get initial location
        await refreshLocation();
        
        // Start compass if location is available
        if (state.location.latitude && state.location.longitude) {
          await startCompass();
        }
      } else if (options.useStateLocation && culturalPreferences?.location?.state) {
        // Use state location as fallback
        updateLocationFromState(culturalPreferences.location.state as MalaysianState);
      } else if (options.fallbackState) {
        updateLocationFromState(options.fallbackState);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      stopCompass();
    };
  }, []);

  // Update location when cultural preferences change
  useEffect(() => {
    if (options.useStateLocation && culturalPreferences?.location?.state) {
      updateLocationFromState(culturalPreferences.location.state as MalaysianState);
    }
  }, [culturalPreferences?.location?.state, options.useStateLocation, updateLocationFromState]);

  return {
    // State
    ...state,

    // Actions
    refreshLocation,
    startCompass,
    stopCompass,
    calculateQiblaForLocation,
    updateLocationFromState,
    requestPermissions,
    clearError
  };
};