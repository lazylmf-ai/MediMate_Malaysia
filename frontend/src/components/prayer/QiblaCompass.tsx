/**
 * Qibla Compass Component
 * 
 * Interactive Qibla direction compass with:
 * - Real-time direction indicator
 * - Device orientation support
 * - Location-based accuracy
 * - Visual compass design
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions 
} from 'react-native';
import { useQiblaDirection } from '../../hooks/prayer';
import { useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/culturalSlice';

interface QiblaCompassProps {
  style?: any;
  size?: number;
  showLocationInfo?: boolean;
  onLocationPress?: () => void;
}

const QiblaCompass: React.FC<QiblaCompassProps> = ({
  style,
  size = 200,
  showLocationInfo = true,
  onLocationPress
}) => {
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const [compassAnimation] = useState(new Animated.Value(0));
  const [qiblaAnimation] = useState(new Animated.Value(0));

  const {
    qiblaDirection,
    deviceHeading,
    relativeQiblaDirection,
    accuracy,
    location,
    isLoading,
    error,
    permissions,
    startCompass,
    stopCompass,
    refreshLocation,
    requestPermissions
  } = useQiblaDirection({
    autoStart: true,
    highAccuracy: true,
    useStateLocation: true,
    fallbackState: 'kuala_lumpur'
  });

  // Animate compass rotation
  useEffect(() => {
    if (deviceHeading !== null) {
      Animated.timing(compassAnimation, {
        toValue: -deviceHeading * (Math.PI / 180), // Convert to radians, negative for counter-rotation
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [deviceHeading, compassAnimation]);

  // Animate Qibla indicator rotation
  useEffect(() => {
    if (relativeQiblaDirection !== null) {
      Animated.timing(qiblaAnimation, {
        toValue: relativeQiblaDirection * (Math.PI / 180), // Convert to radians
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [relativeQiblaDirection, qiblaAnimation]);

  const handleStartCompass = async () => {
    if (!permissions.location || !permissions.compass) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    
    await refreshLocation();
    await startCompass();
  };

  const getAccuracyColor = (accuracyLevel: string): string => {
    switch (accuracyLevel) {
      case 'high': return '#00b894';
      case 'medium': return '#fdcb6e';
      case 'low': return '#e17055';
      default: return '#95a5a6';
    }
  };

  const getAccuracyText = (accuracyLevel: string): string => {
    if (culturalPreferences?.language === 'ms') {
      switch (accuracyLevel) {
        case 'high': return 'Ketepatan Tinggi';
        case 'medium': return 'Ketepatan Sederhana';
        case 'low': return 'Ketepatan Rendah';
        default: return 'Tidak Diketahui';
      }
    } else {
      switch (accuracyLevel) {
        case 'high': return 'High Accuracy';
        case 'medium': return 'Medium Accuracy';
        case 'low': return 'Low Accuracy';
        default: return 'Unknown';
      }
    }
  };

  const renderCompass = () => {
    return (
      <View style={[styles.compassContainer, { width: size, height: size }]}>
        {/* Main compass circle */}
        <View style={[styles.compassCircle, { width: size, height: size }]}>
          
          {/* Compass markings */}
          <Animated.View 
            style={[
              styles.compassMarkings,
              {
                transform: [{ rotate: compassAnimation }]
              }
            ]}
          >
            {/* Cardinal directions */}
            {['N', 'E', 'S', 'W'].map((direction, index) => (
              <View
                key={direction}
                style={[
                  styles.cardinalMark,
                  {
                    transform: [
                      { rotate: `${index * 90}deg` },
                      { translateY: -size / 2 + 15 }
                    ]
                  }
                ]}
              >
                <Text style={[
                  styles.cardinalText,
                  direction === 'N' && styles.northText
                ]}>
                  {direction}
                </Text>
              </View>
            ))}

            {/* Degree markings */}
            {Array.from({ length: 36 }, (_, i) => i * 10).map((degree) => (
              <View
                key={degree}
                style={[
                  styles.degreeMark,
                  {
                    transform: [
                      { rotate: `${degree}deg` },
                      { translateY: -size / 2 + 5 }
                    ]
                  },
                  degree % 90 === 0 && styles.majorDegreeMark
                ]}
              />
            ))}
          </Animated.View>

          {/* Qibla direction indicator */}
          {qiblaDirection !== null && (
            <Animated.View
              style={[
                styles.qiblaIndicator,
                {
                  transform: [{ rotate: qiblaAnimation }]
                }
              ]}
            >
              <View style={styles.qiblaArrow} />
              <Text style={styles.qiblaText}>
                {culturalPreferences?.language === 'ms' ? 'KIBLAT' : 'QIBLA'}
              </Text>
            </Animated.View>
          )}

          {/* Center dot */}
          <View style={styles.centerDot} />

          {/* Device heading indicator (fixed at top) */}
          <View style={styles.deviceIndicator}>
            <View style={styles.deviceArrow} />
          </View>
        </View>

        {/* Qibla direction info */}
        {qiblaDirection !== null && (
          <View style={styles.directionInfo}>
            <Text style={styles.directionLabel}>
              {culturalPreferences?.language === 'ms' ? 'Arah Kiblat' : 'Qibla Direction'}
            </Text>
            <Text style={styles.directionValue}>
              {Math.round(qiblaDirection)}°
            </Text>
            {relativeQiblaDirection !== null && (
              <Text style={styles.relativeDirection}>
                {culturalPreferences?.language === 'ms' 
                  ? `${Math.round(relativeQiblaDirection)}° dari hadapan`
                  : `${Math.round(relativeQiblaDirection)}° from front`}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.compassContainer, { width: size, height: size }]}>
          <View style={[styles.loadingContainer, { width: size, height: size }]}>
            <Text style={styles.loadingText}>
              {culturalPreferences?.language === 'ms' 
                ? 'Mengira arah kiblat...' 
                : 'Calculating Qibla direction...'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !permissions.location) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.compassContainer, { width: size, height: size }]}>
          <View style={[styles.errorContainer, { width: size, height: size }]}>
            <Text style={styles.errorText}>
              {error || (culturalPreferences?.language === 'ms' 
                ? 'Kebenaran lokasi diperlukan' 
                : 'Location permission required')}
            </Text>
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={handleStartCompass}
            >
              <Text style={styles.permissionButtonText}>
                {culturalPreferences?.language === 'ms' ? 'Benarkan' : 'Grant Permission'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {renderCompass()}

      {/* Location and accuracy info */}
      {showLocationInfo && location.latitude && location.longitude && (
        <View style={styles.locationInfo}>
          <TouchableOpacity 
            style={styles.locationRow}
            onPress={onLocationPress}
            disabled={!onLocationPress}
          >
            <Text style={styles.locationLabel}>
              {culturalPreferences?.language === 'ms' ? 'Lokasi:' : 'Location:'}
            </Text>
            <Text style={styles.locationCoords}>
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.accuracyRow}>
            <Text style={styles.accuracyLabel}>
              {culturalPreferences?.language === 'ms' ? 'Ketepatan:' : 'Accuracy:'}
            </Text>
            <View style={[
              styles.accuracyIndicator,
              { backgroundColor: getAccuracyColor(accuracy) }
            ]}>
              <Text style={styles.accuracyText}>
                {getAccuracyText(accuracy)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Control buttons */}
      <View style={styles.controlButtons}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={refreshLocation}
        >
          <Text style={styles.controlButtonText}>
            {culturalPreferences?.language === 'ms' ? 'Kemas Kini' : 'Refresh'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={deviceHeading !== null ? stopCompass : handleStartCompass}
        >
          <Text style={styles.controlButtonText}>
            {deviceHeading !== null 
              ? (culturalPreferences?.language === 'ms' ? 'Berhenti' : 'Stop')
              : (culturalPreferences?.language === 'ms' ? 'Mula' : 'Start')
            }
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  compassCircle: {
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#00b894',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  compassMarkings: {
    position: 'absolute',
    width: '100%',
    height: '100%'
  },
  cardinalMark: {
    position: 'absolute',
    alignItems: 'center'
  },
  cardinalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436'
  },
  northText: {
    color: '#e17055',
    fontSize: 18
  },
  degreeMark: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: '#636e72',
    left: '50%',
    marginLeft: -1
  },
  majorDegreeMark: {
    height: 12,
    backgroundColor: '#2d3436',
    width: 3,
    marginLeft: -1.5
  },
  qiblaIndicator: {
    position: 'absolute',
    alignItems: 'center'
  },
  qiblaArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00b894',
    marginTop: -70
  },
  qiblaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00b894',
    marginTop: -15,
    textAlign: 'center'
  },
  centerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2d3436'
  },
  deviceIndicator: {
    position: 'absolute',
    top: 5,
    alignItems: 'center'
  },
  deviceArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e17055'
  },
  directionInfo: {
    alignItems: 'center',
    marginTop: 12
  },
  directionLabel: {
    fontSize: 12,
    color: '#636e72',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  directionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00b894',
    marginTop: 4
  },
  relativeDirection: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 2
  },
  locationInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 12
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  locationLabel: {
    fontSize: 14,
    color: '#636e72',
    fontWeight: '500'
  },
  locationCoords: {
    fontSize: 14,
    color: '#2d3436',
    fontFamily: 'monospace'
  },
  accuracyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accuracyLabel: {
    fontSize: 14,
    color: '#636e72',
    fontWeight: '500'
  },
  accuracyIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  accuracyText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600'
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12
  },
  controlButton: {
    backgroundColor: '#00b894',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 80
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed'
  },
  loadingText: {
    fontSize: 14,
    color: '#636e72',
    textAlign: 'center'
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e17055',
    borderStyle: 'dashed',
    padding: 20
  },
  errorText: {
    fontSize: 12,
    color: '#e17055',
    textAlign: 'center',
    marginBottom: 12
  },
  permissionButton: {
    backgroundColor: '#00b894',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  }
});

export default QiblaCompass;