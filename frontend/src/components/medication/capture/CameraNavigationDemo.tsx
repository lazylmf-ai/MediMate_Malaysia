/**
 * Camera Navigation Demo Component
 * 
 * Demonstrates how to integrate the camera capture flow into the
 * existing navigation system with proper state management.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import MedicationCameraScreen from './MedicationCameraScreen';
import PhotoPreviewScreen from './PhotoPreviewScreen';
import { CapturedImage } from '../../../types/medication';

type CameraFlowState = 'closed' | 'camera' | 'preview' | 'processing';

interface CameraNavigationDemoProps {
  onMedicationPhotoSelected?: (image: CapturedImage) => void;
  onClose?: () => void;
}

export const CameraNavigationDemo: React.FC<CameraNavigationDemoProps> = ({
  onMedicationPhotoSelected,
  onClose
}) => {
  const [flowState, setFlowState] = useState<CameraFlowState>('closed');
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  
  const culturalProfile = useAppSelector(state => state.cultural.profile);
  const accessibilityConfig = culturalProfile?.accessibility;

  const openCamera = () => {
    setFlowState('camera');
  };

  const handlePhotoCapture = (image: CapturedImage) => {
    setCapturedImage(image);
    setFlowState('preview');
  };

  const handlePhotoConfirm = (processedImage: CapturedImage) => {
    onMedicationPhotoSelected?.(processedImage);
    setFlowState('processing');
    
    // Simulate processing delay
    setTimeout(() => {
      Alert.alert(
        culturalProfile?.language === 'ms' ? 'Selesai' : 'Complete',
        culturalProfile?.language === 'ms' 
          ? 'Gambar ubat telah disimpan dan siap untuk dianalisis.'
          : 'Medication photo has been saved and is ready for analysis.',
        [
          {
            text: culturalProfile?.language === 'ms' ? 'OK' : 'OK',
            onPress: () => {
              setFlowState('closed');
              onClose?.();
            }
          }
        ]
      );
    }, 2000);
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setFlowState('camera');
  };

  const handleCloseFlow = () => {
    setCapturedImage(null);
    setFlowState('closed');
    onClose?.();
  };

  const renderCameraFlow = () => {
    switch (flowState) {
      case 'camera':
        return (
          <Modal visible={true} animationType="slide" statusBarTranslucent>
            <MedicationCameraScreen
              onPhotoCapture={handlePhotoCapture}
              onClose={handleCloseFlow}
              showGalleryOption={true}
            />
          </Modal>
        );

      case 'preview':
        return capturedImage ? (
          <Modal visible={true} animationType="slide" statusBarTranslucent>
            <PhotoPreviewScreen
              image={capturedImage}
              onConfirm={handlePhotoConfirm}
              onRetake={handleRetakePhoto}
              onCancel={handleCloseFlow}
              showProcessingOptions={true}
            />
          </Modal>
        ) : null;

      case 'processing':
        return (
          <Modal visible={true} animationType="fade" transparent>
            <View style={styles.processingOverlay}>
              <View style={styles.processingContainer}>
                <Ionicons name="sync" size={48} color="#007AFF" style={styles.processingIcon} />
                <Text style={[styles.processingText, accessibilityConfig?.textSize === 'large' && styles.largeProcessingText]}>
                  {culturalProfile?.language === 'ms' 
                    ? 'Memproses gambar ubat...'
                    : 'Processing medication image...'}
                </Text>
              </View>
            </View>
          </Modal>
        );

      default:
        return null;
    }
  };

  if (flowState !== 'closed') {
    return renderCameraFlow();
  }

  // Demo trigger button
  return (
    <SafeAreaView style={styles.demoContainer}>
      <View style={styles.content}>
        <Text style={[styles.title, accessibilityConfig?.textSize === 'large' && styles.largeTitle]}>
          {culturalProfile?.language === 'ms' ? 'Tangkap Gambar Ubat' : 'Capture Medication Photo'}
        </Text>
        
        <Text style={[styles.description, accessibilityConfig?.textSize === 'large' && styles.largeDescription]}>
          {culturalProfile?.language === 'ms' 
            ? 'Gunakan kamera untuk mengambil gambar label ubat dan sistem akan mengenali maklumat ubat secara automatik.'
            : 'Use the camera to capture medication labels and the system will automatically recognize medication information.'}
        </Text>

        <TouchableOpacity
          style={[styles.cameraButton, accessibilityConfig?.largeButtons && styles.largeCameraButton]}
          onPress={openCamera}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text style={[styles.cameraButtonText, accessibilityConfig?.textSize === 'large' && styles.largeCameraButtonText]}>
            {culturalProfile?.language === 'ms' ? 'Buka Kamera' : 'Open Camera'}
          </Text>
        </TouchableOpacity>

        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, accessibilityConfig?.textSize === 'large' && styles.largeFeaturesTitle]}>
            {culturalProfile?.language === 'ms' ? 'Ciri-ciri:' : 'Features:'}
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="eye" size={20} color="#4CAF50" />
              <Text style={[styles.featureText, accessibilityConfig?.textSize === 'large' && styles.largeFeatureText]}>
                {culturalProfile?.language === 'ms' ? 'Auto-fokus untuk teks yang jelas' : 'Auto-focus for clear text'}
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="flash" size={20} color="#FF9800" />
              <Text style={[styles.featureText, accessibilityConfig?.textSize === 'large' && styles.largeFeatureText]}>
                {culturalProfile?.language === 'ms' ? 'Pengoptimuman cahaya' : 'Lighting optimization'}
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="build" size={20} color="#2196F3" />
              <Text style={[styles.featureText, accessibilityConfig?.textSize === 'large' && styles.largeFeatureText]}>
                {culturalProfile?.language === 'ms' ? 'Pemprosesan imej untuk OCR' : 'Image processing for OCR'}
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={20} color="#9C27B0" />
              <Text style={[styles.featureText, accessibilityConfig?.textSize === 'large' && styles.largeFeatureText]}>
                {culturalProfile?.language === 'ms' ? 'Penyimpanan selamat' : 'Secure storage'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  demoContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  largeTitle: {
    fontSize: 32,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    color: '#666',
    paddingHorizontal: 20,
  },
  largeDescription: {
    fontSize: 20,
    lineHeight: 30,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 40,
    gap: 12,
  },
  largeCameraButton: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  cameraButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  largeCameraButtonText: {
    fontSize: 22,
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  largeFeaturesTitle: {
    fontSize: 22,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  largeFeatureText: {
    fontSize: 20,
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  processingIcon: {
    // In a real implementation, this would be animated
  },
  processingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  largeProcessingText: {
    fontSize: 20,
  },
});

export default CameraNavigationDemo;