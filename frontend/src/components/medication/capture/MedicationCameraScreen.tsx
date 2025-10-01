/**
 * Medication Camera Screen Component
 * 
 * Main camera interface for capturing medication photos with
 * elderly-friendly UI, auto-focus, and Malaysian cultural considerations.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../../store/hooks';
import { CameraService } from '../../../services/camera/CameraService';
import { ImageProcessor } from '../../../utils/image/ImageProcessor';
import { CapturedImage, PhotoCaptureOptions } from '../../../types/medication';

interface MedicationCameraScreenProps {
  onPhotoCapture: (image: CapturedImage) => void;
  onClose: () => void;
  onImportGallery?: () => void;
  showGalleryOption?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const MedicationCameraScreen: React.FC<MedicationCameraScreenProps> = ({
  onPhotoCapture,
  onClose,
  onImportGallery,
  showGalleryOption = true
}) => {
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Animation for capture feedback
  const captureAnimation = useRef(new Animated.Value(0)).current;
  const flashAnimation = useRef(new Animated.Value(0)).current;

  // Get cultural preferences for UI adaptation
  const culturalProfile = useAppSelector(state => state.cultural.profile);
  const accessibilityConfig = culturalProfile?.accessibility;

  const cameraService = CameraService.getInstance();
  const imageProcessor = ImageProcessor.getInstance();

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const permissions = await cameraService.requestPermissions();
      setHasPermission(permissions.camera);
      
      if (!permissions.camera) {
        Alert.alert(
          culturalProfile?.language === 'ms' ? 'Kebenaran Diperlukan' : 'Permission Required',
          culturalProfile?.language === 'ms' 
            ? 'Aplikasi ini memerlukan akses kamera untuk mengambil gambar ubat.'
            : 'This app needs camera access to capture medication photos.',
          [
            {
              text: culturalProfile?.language === 'ms' ? 'Batal' : 'Cancel',
              style: 'cancel'
            },
            {
              text: culturalProfile?.language === 'ms' ? 'Tetapan' : 'Settings',
              onPress: () => {
                // In production, would open device settings
                Alert.alert('Please enable camera permission in device settings');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing || isProcessing) return;

    setIsCapturing(true);
    setIsProcessing(true);

    try {
      // Visual feedback for capture
      Animated.sequence([
        Animated.timing(captureAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(captureAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();

      // Flash animation if enabled
      if (flashMode === 'on') {
        Animated.timing(flashAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }).start(() => {
          Animated.timing(flashAnimation, {
            toValue: 0,
            duration: 100,
            useNativeDriver: false,
          }).start();
        });
      }

      const options: PhotoCaptureOptions = {
        source: 'camera',
        quality: 0.8,
        allowsEditing: false,
        aspect: [4, 3], // Good ratio for medication labels
      };

      const capturedImage = await cameraService.capturePhoto(options);
      
      // Process image for OCR optimization
      const processingResult = await imageProcessor.processForOCR(capturedImage, {
        enhanceContrast: true,
        adjustBrightness: true,
        autoRotate: true,
        cropToLabel: false, // Let user crop manually
        resizeForOCR: true
      });

      onPhotoCapture(processingResult.processedImage);
      
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert(
        culturalProfile?.language === 'ms' ? 'Ralat' : 'Error',
        culturalProfile?.language === 'ms' 
          ? 'Gagal mengambil gambar. Sila cuba lagi.'
          : 'Failed to capture photo. Please try again.'
      );
    } finally {
      setIsCapturing(false);
      setIsProcessing(false);
    }
  };

  const handleImportFromGallery = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      const capturedImage = await cameraService.importFromGallery({
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3]
      });

      const processingResult = await imageProcessor.processForOCR(capturedImage);
      onPhotoCapture(processingResult.processedImage);
    } catch (error) {
      console.error('Error importing from gallery:', error);
      if (!error.message.includes('cancelled')) {
        Alert.alert(
          culturalProfile?.language === 'ms' ? 'Ralat' : 'Error',
          culturalProfile?.language === 'ms' 
            ? 'Gagal mengimport gambar dari galeri.'
            : 'Failed to import image from gallery.'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFlash = () => {
    const modes: ('off' | 'on' | 'auto')[] = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  const flipCamera = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons 
            name="camera-outline" 
            size={80} 
            color="#666" 
            style={styles.permissionIcon}
          />
          <Text style={[styles.permissionText, accessibilityConfig?.textSize === 'large' && styles.largeText]}>
            {culturalProfile?.language === 'ms' 
              ? 'Kebenaran kamera diperlukan untuk mengambil gambar ubat'
              : 'Camera permission required to capture medication photos'}
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, accessibilityConfig?.largeButtons && styles.largeButton]}
            onPress={requestPermissions}
          >
            <Text style={styles.permissionButtonText}>
              {culturalProfile?.language === 'ms' ? 'Berikan Kebenaran' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      {/* Flash overlay for visual feedback */}
      <Animated.View 
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnimation
          }
        ]}
        pointerEvents="none"
      />

      {/* Camera preview */}
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          flashMode={flashMode}
          ratio="4:3"
          autoFocus={Camera.Constants.AutoFocus.on}
        >
          {/* Camera overlay with guide */}
          <View style={styles.cameraOverlay}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={[styles.headerButton, accessibilityConfig?.largeButtons && styles.largeHeaderButton]}
                onPress={onClose}
              >
                <Ionicons name="close" size={accessibilityConfig?.largeButtons ? 32 : 24} color="white" />
              </TouchableOpacity>
              
              <Text style={[styles.headerTitle, accessibilityConfig?.textSize === 'large' && styles.largeHeaderTitle]}>
                {culturalProfile?.language === 'ms' ? 'Tangkap Ubat' : 'Capture Medication'}
              </Text>
              
              <TouchableOpacity 
                style={[styles.headerButton, accessibilityConfig?.largeButtons && styles.largeHeaderButton]}
                onPress={toggleFlash}
              >
                <Ionicons 
                  name={flashMode === 'off' ? 'flash-off' : flashMode === 'on' ? 'flash' : 'flash-outline'} 
                  size={accessibilityConfig?.largeButtons ? 32 : 24} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>

            {/* Center guide frame */}
            <View style={styles.guideContainer}>
              <Text style={[styles.guideText, accessibilityConfig?.textSize === 'large' && styles.largeGuideText]}>
                {culturalProfile?.language === 'ms' 
                  ? 'Letakkan label ubat dalam bingkai'
                  : 'Place medication label within frame'}
              </Text>
              <View style={styles.guideFrame} />
            </View>

            {/* Bottom controls */}
            <View style={styles.bottomControls}>
              {/* Gallery import button */}
              {showGalleryOption && (
                <TouchableOpacity 
                  style={[styles.controlButton, accessibilityConfig?.largeButtons && styles.largeControlButton]}
                  onPress={onImportGallery || handleImportFromGallery}
                  disabled={isProcessing}
                >
                  <Ionicons 
                    name="images" 
                    size={accessibilityConfig?.largeButtons ? 32 : 24} 
                    color="white" 
                  />
                  <Text style={[styles.controlButtonText, accessibilityConfig?.textSize === 'large' && styles.largeControlButtonText]}>
                    {culturalProfile?.language === 'ms' ? 'Galeri' : 'Gallery'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Capture button */}
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  accessibilityConfig?.largeButtons && styles.largeCaptureButton,
                  isCapturing && styles.capturingButton,
                  {
                    backgroundColor: captureAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['white', '#ff4444']
                    })
                  }
                ]}
                onPress={handleCapture}
                disabled={isCapturing || isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <Ionicons name="sync" size={32} color="#333" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>

              {/* Camera flip button */}
              <TouchableOpacity 
                style={[styles.controlButton, accessibilityConfig?.largeButtons && styles.largeControlButton]}
                onPress={flipCamera}
                disabled={isProcessing}
              >
                <Ionicons 
                  name="camera-reverse" 
                  size={accessibilityConfig?.largeButtons ? 32 : 24} 
                  color="white" 
                />
                <Text style={[styles.controlButtonText, accessibilityConfig?.textSize === 'large' && styles.largeControlButtonText]}>
                  {culturalProfile?.language === 'ms' ? 'Pusing' : 'Flip'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Camera>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={[styles.instructionText, accessibilityConfig?.textSize === 'large' && styles.largeInstructionText]}>
          {culturalProfile?.language === 'ms' 
            ? '• Pastikan cahaya mencukupi\n• Fokus pada label ubat\n• Pegang telefon dengan stabil'
            : '• Ensure good lighting\n• Focus on medication label\n• Hold phone steady'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  largeHeaderButton: {
    padding: 12,
    borderRadius: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  largeHeaderTitle: {
    fontSize: 24,
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guideText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  largeGuideText: {
    fontSize: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  guideFrame: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.6,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
  },
  largeControlButton: {
    padding: 16,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  largeControlButtonText: {
    fontSize: 16,
    marginTop: 8,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  largeCaptureButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
  },
  capturingButton: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  largeInstructionText: {
    fontSize: 18,
    lineHeight: 26,
  },
  largeText: {
    fontSize: 20,
  },
  largeButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionIcon: {
    marginBottom: 30,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicationCameraScreen;