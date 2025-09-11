/**
 * Photo Preview Screen Component
 * 
 * Allows users to review captured medication photos, apply additional
 * processing, and confirm before proceeding to OCR analysis.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../../store/hooks';
import { ImageProcessor } from '../../../utils/image/ImageProcessor';
import { CapturedImage } from '../../../types/medication';

interface PhotoPreviewScreenProps {
  image: CapturedImage;
  onConfirm: (processedImage: CapturedImage) => void;
  onRetake: () => void;
  onCancel: () => void;
  showProcessingOptions?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PhotoPreviewScreen: React.FC<PhotoPreviewScreenProps> = ({
  image,
  onConfirm,
  onRetake,
  onCancel,
  showProcessingOptions = true
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<CapturedImage>(image);
  const [processingOptions, setProcessingOptions] = useState({
    enhanceContrast: true,
    adjustBrightness: false,
    autoRotate: true,
    cropToLabel: false
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Get cultural preferences
  const culturalProfile = useAppSelector(state => state.cultural.profile);
  const accessibilityConfig = culturalProfile?.accessibility;

  const imageProcessor = ImageProcessor.getInstance();

  React.useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleProcessImage = async () => {
    setIsProcessing(true);
    try {
      const result = await imageProcessor.processForOCR(image, processingOptions);
      setProcessedImage(result.processedImage);
      
      // Show success feedback
      Alert.alert(
        culturalProfile?.language === 'ms' ? 'Selesai' : 'Complete',
        culturalProfile?.language === 'ms' 
          ? 'Gambar telah diproses untuk analisis OCR'
          : 'Image has been processed for OCR analysis'
      );
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert(
        culturalProfile?.language === 'ms' ? 'Ralat' : 'Error',
        culturalProfile?.language === 'ms' 
          ? 'Gagal memproses gambar'
          : 'Failed to process image'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      culturalProfile?.language === 'ms' ? 'Sahkan Gambar' : 'Confirm Image',
      culturalProfile?.language === 'ms' 
        ? 'Adakah anda pasti untuk menggunakan gambar ini untuk pengenalan ubat?'
        : 'Are you sure you want to use this image for medication recognition?',
      [
        {
          text: culturalProfile?.language === 'ms' ? 'Batal' : 'Cancel',
          style: 'cancel'
        },
        {
          text: culturalProfile?.language === 'ms' ? 'Sahkan' : 'Confirm',
          onPress: () => onConfirm(processedImage)
        }
      ]
    );
  };

  const toggleProcessingOption = (option: keyof typeof processingOptions) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const getImageQualityIndicator = () => {
    const validation = imageProcessor.validateImageForOCR ? 
      imageProcessor.validateImageForOCR(processedImage) : 
      { isValid: true, issues: [], recommendations: [] };

    return {
      isGood: validation.isValid,
      issues: validation.issues,
      recommendations: validation.recommendations
    };
  };

  const qualityInfo = getImageQualityIndicator();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.headerButton, accessibilityConfig?.largeButtons && styles.largeHeaderButton]}
            onPress={onCancel}
          >
            <Ionicons name="close" size={accessibilityConfig?.largeButtons ? 32 : 24} color="white" />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, accessibilityConfig?.textSize === 'large' && styles.largeHeaderTitle]}>
            {culturalProfile?.language === 'ms' ? 'Pratonton Gambar' : 'Photo Preview'}
          </Text>
          
          <View style={styles.headerButton} />
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: processedImage.uri }} 
            style={styles.previewImage}
            resizeMode="contain"
          />
          
          {/* Quality indicator */}
          <View style={[styles.qualityIndicator, qualityInfo.isGood ? styles.qualityGood : styles.qualityPoor]}>
            <Ionicons 
              name={qualityInfo.isGood ? "checkmark-circle" : "warning"} 
              size={16} 
              color={qualityInfo.isGood ? "#4CAF50" : "#FF9800"} 
            />
            <Text style={[styles.qualityText, { color: qualityInfo.isGood ? "#4CAF50" : "#FF9800" }]}>
              {qualityInfo.isGood 
                ? (culturalProfile?.language === 'ms' ? 'Kualiti Baik' : 'Good Quality')
                : (culturalProfile?.language === 'ms' ? 'Kualiti Rendah' : 'Poor Quality')
              }
            </Text>
          </View>
        </View>

        {/* Processing Options */}
        {showProcessingOptions && (
          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.optionsTitle, accessibilityConfig?.textSize === 'large' && styles.largeOptionsTitle]}>
              {culturalProfile?.language === 'ms' ? 'Pilihan Pemprosesan' : 'Processing Options'}
            </Text>
            
            <View style={styles.optionsList}>
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => toggleProcessingOption('enhanceContrast')}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, accessibilityConfig?.textSize === 'large' && styles.largeOptionText]}>
                    {culturalProfile?.language === 'ms' ? 'Tingkatkan Kontras' : 'Enhance Contrast'}
                  </Text>
                  <Text style={[styles.optionDescription, accessibilityConfig?.textSize === 'large' && styles.largeOptionDescription]}>
                    {culturalProfile?.language === 'ms' 
                      ? 'Membantu membaca teks dengan lebih jelas'
                      : 'Helps make text more readable'}
                  </Text>
                </View>
                <View style={[styles.checkbox, processingOptions.enhanceContrast && styles.checkboxChecked]}>
                  {processingOptions.enhanceContrast && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => toggleProcessingOption('adjustBrightness')}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, accessibilityConfig?.textSize === 'large' && styles.largeOptionText]}>
                    {culturalProfile?.language === 'ms' ? 'Laraskan Kecerahan' : 'Adjust Brightness'}
                  </Text>
                  <Text style={[styles.optionDescription, accessibilityConfig?.textSize === 'large' && styles.largeOptionDescription]}>
                    {culturalProfile?.language === 'ms' 
                      ? 'Sesuaikan pencahayaan gambar'
                      : 'Optimize image lighting'}
                  </Text>
                </View>
                <View style={[styles.checkbox, processingOptions.adjustBrightness && styles.checkboxChecked]}>
                  {processingOptions.adjustBrightness && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => toggleProcessingOption('autoRotate')}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, accessibilityConfig?.textSize === 'large' && styles.largeOptionText]}>
                    {culturalProfile?.language === 'ms' ? 'Auto Putar' : 'Auto Rotate'}
                  </Text>
                  <Text style={[styles.optionDescription, accessibilityConfig?.textSize === 'large' && styles.largeOptionDescription]}>
                    {culturalProfile?.language === 'ms' 
                      ? 'Betulkan orientasi gambar secara automatik'
                      : 'Automatically correct image orientation'}
                  </Text>
                </View>
                <View style={[styles.checkbox, processingOptions.autoRotate && styles.checkboxChecked]}>
                  {processingOptions.autoRotate && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Process button */}
            <TouchableOpacity
              style={[styles.processButton, accessibilityConfig?.largeButtons && styles.largeProcessButton]}
              onPress={handleProcessImage}
              disabled={isProcessing}
            >
              <Ionicons 
                name={isProcessing ? "sync" : "build"} 
                size={20} 
                color="white" 
                style={isProcessing && styles.spinningIcon}
              />
              <Text style={[styles.processButtonText, accessibilityConfig?.textSize === 'large' && styles.largeProcessButtonText]}>
                {isProcessing 
                  ? (culturalProfile?.language === 'ms' ? 'Memproses...' : 'Processing...')
                  : (culturalProfile?.language === 'ms' ? 'Proses Gambar' : 'Process Image')
                }
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Quality Issues */}
        {!qualityInfo.isGood && qualityInfo.recommendations.length > 0 && (
          <View style={styles.qualityIssues}>
            <Text style={[styles.qualityIssuesTitle, accessibilityConfig?.textSize === 'large' && styles.largeQualityIssuesTitle]}>
              {culturalProfile?.language === 'ms' ? 'Cadangan Penambahbaikan:' : 'Improvement Suggestions:'}
            </Text>
            {qualityInfo.recommendations.map((recommendation, index) => (
              <Text key={index} style={[styles.qualityIssueText, accessibilityConfig?.textSize === 'large' && styles.largeQualityIssueText]}>
                • {recommendation}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton, accessibilityConfig?.largeButtons && styles.largeActionButton]}
            onPress={onRetake}
          >
            <Ionicons name="camera" size={20} color="#666" />
            <Text style={[styles.actionButtonText, { color: '#666' }, accessibilityConfig?.textSize === 'large' && styles.largeActionButtonText]}>
              {culturalProfile?.language === 'ms' ? 'Tangkap Semula' : 'Retake'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton, accessibilityConfig?.largeButtons && styles.largeActionButton]}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={[styles.actionButtonText, { color: 'white' }, accessibilityConfig?.textSize === 'large' && styles.largeActionButtonText]}>
              {culturalProfile?.language === 'ms' ? 'Sahkan' : 'Confirm'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeHeaderButton: {
    padding: 12,
    width: 48,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  largeHeaderTitle: {
    fontSize: 24,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#111',
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  qualityIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  qualityGood: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  qualityPoor: {
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  optionsContainer: {
    maxHeight: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 15,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  largeOptionsTitle: {
    fontSize: 20,
  },
  optionsList: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  largeOptionText: {
    fontSize: 18,
  },
  optionDescription: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 16,
  },
  largeOptionDescription: {
    fontSize: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  largeProcessButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  largeProcessButtonText: {
    fontSize: 20,
  },
  spinningIcon: {
    // Animation would be added with Animated.Value in a real implementation
  },
  qualityIssues: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  qualityIssuesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  largeQualityIssuesTitle: {
    fontSize: 18,
  },
  qualityIssueText: {
    fontSize: 12,
    color: '#FFB74D',
    lineHeight: 18,
  },
  largeQualityIssueText: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  largeActionButton: {
    paddingVertical: 20,
  },
  retakeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#666',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  largeActionButtonText: {
    fontSize: 20,
  },
});

export default PhotoPreviewScreen;