/**
 * Location-Based Cultural Defaults Component
 * 
 * Provides intelligent location-based cultural defaults for Malaysian users,
 * including prayer times, cultural context, and elder care traditions.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateCulturalProfile } from '@/store/slices/culturalSlice';
import { 
  MalaysianState, 
  LocationDefaults, 
  MALAYSIAN_STATES_DATA,
  EnhancedCulturalProfile 
} from '@/types/cultural';

interface LocationBasedDefaultsProps {
  onLocationSelected?: (locationDefaults: LocationDefaults) => void;
  initialState?: MalaysianState;
  showAdvancedOptions?: boolean;
}

export const LocationBasedDefaults: React.FC<LocationBasedDefaultsProps> = ({
  onLocationSelected,
  initialState = 'kuala_lumpur',
  showAdvancedOptions = false,
}) => {
  const dispatch = useAppDispatch();
  const { profile, isLoading } = useAppSelector((state) => state.cultural);
  
  const [selectedState, setSelectedState] = useState<MalaysianState>(initialState);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showPrayerTimeDetails, setShowPrayerTimeDetails] = useState(false);
  
  useEffect(() => {
    // Set default city when state changes
    const stateData = MALAYSIAN_STATES_DATA[selectedState];
    if (stateData && stateData.cities.length > 0) {
      setSelectedCity(stateData.cities[0]);
    }
  }, [selectedState]);

  useEffect(() => {
    // Apply location defaults when both state and city are selected
    if (selectedState && selectedCity) {
      applyLocationDefaults();
    }
  }, [selectedState, selectedCity]);

  const detectCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Please enable location access to automatically detect your Malaysian state and city.'
        );
        setIsLoadingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Find nearest Malaysian state based on coordinates
      const nearestState = findNearestMalaysianState(
        location.coords.latitude,
        location.coords.longitude
      );

      if (nearestState) {
        setSelectedState(nearestState.state);
        setSelectedCity(nearestState.city);
        
        Alert.alert(
          'Location Detected',
          `Detected location: ${nearestState.city}, ${nearestState.state.replace('_', ' ').toUpperCase()}`
        );
      } else {
        Alert.alert(
          'Location Not Found',
          'Could not detect a Malaysian location. Please select manually.'
        );
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      Alert.alert(
        'Location Error',
        'Failed to detect location. Please select manually.'
      );
    }
    
    setIsLoadingLocation(false);
  };

  const findNearestMalaysianState = (
    latitude: number, 
    longitude: number
  ): { state: MalaysianState; city: string } | null => {
    let nearestState: MalaysianState | null = null;
    let nearestCity = '';
    let minDistance = Infinity;

    // Calculate distance to each state's coordinates
    Object.entries(MALAYSIAN_STATES_DATA).forEach(([stateKey, stateData]) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        stateData.coordinates.latitude,
        stateData.coordinates.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestState = stateKey as MalaysianState;
        nearestCity = stateData.cities[0];
      }
    });

    return nearestState ? { state: nearestState, city: nearestCity } : null;
  };

  const calculateDistance = (
    lat1: number, lon1: number, 
    lat2: number, lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const applyLocationDefaults = () => {
    const stateData = MALAYSIAN_STATES_DATA[selectedState];
    if (!stateData || !selectedCity) return;

    const locationDefaults: LocationDefaults = {
      state: selectedState,
      city: selectedCity,
      timezone: stateData.timezone,
      coordinates: stateData.coordinates,
      defaultPrayerTimes: stateData.defaultPrayerTimes,
      culturalContext: stateData.culturalContext,
    };

    // Apply defaults to cultural profile
    if (profile) {
      const enhancedProfile: Partial<EnhancedCulturalProfile> = {
        ...profile,
        timezone: locationDefaults.timezone,
        prayerTimes: {
          ...profile.prayerTimes,
          madhab: locationDefaults.defaultPrayerTimes.madhab,
          adjustments: locationDefaults.defaultPrayerTimes.adjustments,
        },
        locationDefaults,
      };

      dispatch(updateCulturalProfile(enhancedProfile));
    }

    // Callback for parent component
    if (onLocationSelected) {
      onLocationSelected(locationDefaults);
    }
  };

  const renderCulturalInsights = () => {
    const stateData = MALAYSIAN_STATES_DATA[selectedState];
    if (!stateData) return null;

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Cultural Context for {selectedCity}</Text>
        
        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>Predominant Religion:</Text>
          <Text style={styles.insightValue}>
            {stateData.culturalContext.predominantReligion.charAt(0).toUpperCase() + 
             stateData.culturalContext.predominantReligion.slice(1)}
          </Text>
        </View>

        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>Common Languages:</Text>
          <Text style={styles.insightValue}>
            {stateData.culturalContext.commonLanguages
              .map(lang => lang.toUpperCase())
              .join(', ')}
          </Text>
        </View>

        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>Major Festivals:</Text>
          <Text style={styles.insightValue}>
            {stateData.culturalContext.majorFestivals.join(', ')}
          </Text>
        </View>

        {stateData.culturalContext.elderlyCareTraditions.length > 0 && (
          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Elder Care Traditions:</Text>
            {stateData.culturalContext.elderlyCareTraditions.map((tradition, index) => (
              <View key={index} style={styles.traditionItem}>
                <Text style={styles.traditionName}>{tradition.name}</Text>
                <Text style={styles.traditionDescription}>{tradition.description}</Text>
                {tradition.relevantMedicationTimes && (
                  <Text style={styles.medicationTimes}>
                    Medication timing considerations: {tradition.relevantMedicationTimes.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPrayerTimeDetails = () => {
    if (!showPrayerTimeDetails) return null;

    const stateData = MALAYSIAN_STATES_DATA[selectedState];
    if (!stateData) return null;

    const { defaultPrayerTimes } = stateData;

    return (
      <View style={styles.prayerTimeDetails}>
        <Text style={styles.sectionTitle}>Prayer Time Configuration</Text>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Madhab:</Text>
          <Text style={styles.configValue}>
            {defaultPrayerTimes.madhab.charAt(0).toUpperCase() + defaultPrayerTimes.madhab.slice(1)}
          </Text>
        </View>

        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Calculation Method:</Text>
          <Text style={styles.configValue}>
            {defaultPrayerTimes.calculationMethod.toUpperCase()}
          </Text>
        </View>

        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Timezone:</Text>
          <Text style={styles.configValue}>{stateData.timezone}</Text>
        </View>

        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Coordinates:</Text>
          <Text style={styles.configValue}>
            {stateData.coordinates.latitude.toFixed(4)}, {stateData.coordinates.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Malaysian Location Settings</Text>
        <Text style={styles.subtitle}>
          Select your location for culturally-appropriate defaults
        </Text>
      </View>

      <View style={styles.locationSection}>
        <TouchableOpacity 
          style={styles.detectButton} 
          onPress={detectCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.detectButtonText}>📍 Detect My Location</Text>
          )}
        </TouchableOpacity>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>State:</Text>
          <Picker
            selectedValue={selectedState}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedState(itemValue)}
          >
            {Object.keys(MALAYSIAN_STATES_DATA).map((state) => (
              <Picker.Item
                key={state}
                label={state.replace('_', ' ').toUpperCase()}
                value={state}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>City:</Text>
          <Picker
            selectedValue={selectedCity}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedCity(itemValue)}
          >
            {MALAYSIAN_STATES_DATA[selectedState]?.cities.map((city) => (
              <Picker.Item key={city} label={city} value={city} />
            ))}
          </Picker>
        </View>
      </View>

      {renderCulturalInsights()}

      {showAdvancedOptions && (
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowPrayerTimeDetails(!showPrayerTimeDetails)}
        >
          <Text style={styles.advancedToggleText}>
            {showPrayerTimeDetails ? '▼' : '▶'} Prayer Time Details
          </Text>
        </TouchableOpacity>
      )}

      {renderPrayerTimeDetails()}

      <View style={styles.applySection}>
        <TouchableOpacity 
          style={[styles.applyButton, isLoading && styles.disabledButton]}
          onPress={applyLocationDefaults}
          disabled={isLoading || !selectedState || !selectedCity}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.applyButtonText}>Apply Location Defaults</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  locationSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  detectButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
  },
  insightsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  insightItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    color: '#2c3e50',
  },
  traditionItem: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  traditionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  traditionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 6,
  },
  medicationTimes: {
    fontSize: 13,
    color: '#28a745',
    fontStyle: 'italic',
  },
  advancedToggle: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  advancedToggleText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  prayerTimeDetails: {
    padding: 20,
    backgroundColor: '#fff',
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  configLabel: {
    fontSize: 16,
    color: '#495057',
  },
  configValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  applySection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
    marginBottom: 20,
  },
  applyButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});