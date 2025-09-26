/**
 * OCR Error Boundary and Recovery Component
 *
 * Provides comprehensive error handling, recovery mechanisms, and user-friendly
 * feedback for OCR processing failures in Malaysian medication recognition.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CapturedImage, OCRResult } from '../../../types/medication';
import { OCRService } from '../../../services/ocr/OCRService';
import { ImageProcessor } from '../../../utils/image/ImageProcessor';

interface Props {
  children: ReactNode;
  onRecovery?: (result: OCRResult) => void;
  onFallback?: () => void;
  culturalProfile?: {
    language?: 'ms' | 'en';
    accessibility?: {
      largeButtons?: boolean;
      textSize?: 'normal' | 'large';
    };
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  originalImage?: CapturedImage;
  recoveryStrategies: RecoveryStrategy[];
  currentStrategyIndex: number;
}

interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  action: () => Promise<OCRResult | null>;
  icon: string;
}

export class OCRErrorBoundary extends Component<Props, State> {
  private ocrService = OCRService.getInstance();
  private imageProcessor = ImageProcessor.getInstance();
  private fadeAnimation = new Animated.Value(0);

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
      recoveryStrategies: [],
      currentStrategyIndex: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OCR Error Boundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Initialize recovery strategies
    this.initializeRecoveryStrategies();

    // Start fade-in animation
    Animated.timing(this.fadeAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }

  /**
   * Initialize recovery strategies based on error type and context
   */
  private initializeRecoveryStrategies = () => {
    const strategies: RecoveryStrategy[] = [
      {
        id: 'retry_ocr',
        name: this.props.culturalProfile?.language === 'ms' ? 'Cuba Semula' : 'Retry OCR',
        description: this.props.culturalProfile?.language === 'ms'
          ? 'Cuba semula pengenalan teks dengan tetapan yang sama'
          : 'Retry text recognition with same settings',
        action: this.retryWithSameSettings,
        icon: 'refresh'
      },
      {
        id: 'enhanced_preprocessing',
        name: this.props.culturalProfile?.language === 'ms' ? 'Pemprosesan Lanjutan' : 'Enhanced Processing',
        description: this.props.culturalProfile?.language === 'ms'
          ? 'Gunakan pemprosesan imej yang lebih intensif'
          : 'Use more intensive image preprocessing',
        action: this.retryWithEnhancedPreprocessing,
        icon: 'image'
      },
      {
        id: 'malay_optimization',
        name: this.props.culturalProfile?.language === 'ms' ? 'Optimasi Malaysia' : 'Malaysian Optimization',
        description: this.props.culturalProfile?.language === 'ms'
          ? 'Fokus pada corak ubat Malaysia'
          : 'Focus on Malaysian medication patterns',
        action: this.retryWithMalaysianOptimization,
        icon: 'flag'
      },
      {
        id: 'basic_ocr',
        name: this.props.culturalProfile?.language === 'ms' ? 'OCR Asas' : 'Basic OCR',
        description: this.props.culturalProfile?.language === 'ms'
          ? 'Cuba dengan OCR asas sahaja'
          : 'Try with basic OCR only',
        action: this.retryWithBasicOCR,
        icon: 'text'
      },
      {
        id: 'manual_entry',
        name: this.props.culturalProfile?.language === 'ms' ? 'Masukan Manual' : 'Manual Entry',
        description: this.props.culturalProfile?.language === 'ms'
          ? 'Masukkan maklumat ubat secara manual'
          : 'Enter medication information manually',
        action: this.fallbackToManualEntry,
        icon: 'pencil'
      }
    ];

    this.setState({ recoveryStrategies: strategies });
  };

  /**
   * Retry OCR with same settings
   */
  private retryWithSameSettings = async (): Promise<OCRResult | null> => {
    const { originalImage } = this.state;
    if (!originalImage) return null;

    try {
      return await this.ocrService.extractMedicationInfo(originalImage);
    } catch (error) {
      console.error('Retry with same settings failed:', error);
      return null;
    }
  };

  /**
   * Retry with enhanced image preprocessing
   */
  private retryWithEnhancedPreprocessing = async (): Promise<OCRResult | null> => {
    const { originalImage } = this.state;
    if (!originalImage) return null;

    try {
      // Apply aggressive image preprocessing
      const processingResult = await this.imageProcessor.processForOCR(originalImage, {
        enhanceContrast: true,
        adjustBrightness: true,
        sharpen: true,
        removeNoise: true,
        autoRotate: true,
        resizeForOCR: true,
        targetWidth: 2400,
        targetHeight: 1800
      });

      return await this.ocrService.extractMedicationInfo(
        processingResult.processedImage,
        {
          enhanceAccuracy: true,
          includeConfidenceScoring: true,
          validationStrength: 'high'
        }
      );
    } catch (error) {
      console.error('Enhanced preprocessing failed:', error);
      return null;
    }
  };

  /**
   * Retry with Malaysian-specific optimization
   */
  private retryWithMalaysianOptimization = async (): Promise<OCRResult | null> => {
    const { originalImage } = this.state;
    if (!originalImage) return null;

    try {
      return await this.ocrService.extractMedicationInfo(originalImage, {
        language: 'ms',
        culturalContext: {
          malayContent: true,
          traditionalMedicine: false
        },
        enhanceAccuracy: true,
        validationStrength: 'medium'
      });
    } catch (error) {
      console.error('Malaysian optimization failed:', error);
      return null;
    }
  };

  /**
   * Retry with basic OCR only
   */
  private retryWithBasicOCR = async (): Promise<OCRResult | null> => {
    const { originalImage } = this.state;
    if (!originalImage) return null;

    try {
      return await this.ocrService.extractMedicationInfo(originalImage, {
        enhanceAccuracy: false,
        includeConfidenceScoring: false,
        validationStrength: 'low'
      });
    } catch (error) {
      console.error('Basic OCR failed:', error);
      return null;
    }
  };

  /**
   * Fallback to manual entry
   */
  private fallbackToManualEntry = async (): Promise<OCRResult | null> => {
    if (this.props.onFallback) {
      this.props.onFallback();
    }
    return null;
  };

  /**
   * Attempt recovery with current strategy
   */
  private attemptRecovery = async (strategyIndex: number) => {
    const { recoveryStrategies } = this.state;
    if (strategyIndex >= recoveryStrategies.length) return;

    this.setState({
      isRecovering: true,
      currentStrategyIndex: strategyIndex,
      recoveryAttempts: this.state.recoveryAttempts + 1
    });

    try {
      const strategy = recoveryStrategies[strategyIndex];
      const result = await strategy.action();

      if (result && result.confidence > 0.3) {
        // Recovery successful
        console.log(`Recovery successful with strategy: ${strategy.name}`);

        if (this.props.onRecovery) {
          this.props.onRecovery(result);
        }

        // Reset error state
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false
        });
      } else {
        // Try next strategy
        if (strategyIndex < recoveryStrategies.length - 1) {
          setTimeout(() => this.attemptRecovery(strategyIndex + 1), 1000);
        } else {
          // All strategies failed
          this.setState({ isRecovering: false });
          this.showRecoveryFailedAlert();
        }
      }
    } catch (error) {
      console.error(`Recovery strategy ${strategyIndex} failed:`, error);

      // Try next strategy
      if (strategyIndex < recoveryStrategies.length - 1) {
        setTimeout(() => this.attemptRecovery(strategyIndex + 1), 1000);
      } else {
        this.setState({ isRecovering: false });
        this.showRecoveryFailedAlert();
      }
    }
  };

  /**
   * Show alert when all recovery strategies fail
   */
  private showRecoveryFailedAlert = () => {
    const { culturalProfile } = this.props;
    Alert.alert(
      culturalProfile?.language === 'ms' ? 'Pemulihan Gagal' : 'Recovery Failed',
      culturalProfile?.language === 'ms'
        ? 'Semua strategi pemulihan telah gagal. Sila cuba ambil gambar semula atau masukkan maklumat secara manual.'
        : 'All recovery strategies have failed. Please try taking a new photo or enter information manually.',
      [
        {
          text: culturalProfile?.language === 'ms' ? 'Cuba Gambar Baru' : 'Try New Photo',
          onPress: this.resetAndRetry
        },
        {
          text: culturalProfile?.language === 'ms' ? 'Masukan Manual' : 'Manual Entry',
          onPress: () => {
            if (this.props.onFallback) {
              this.props.onFallback();
            }
          }
        }
      ]
    );
  };

  /**
   * Reset error state and retry from beginning
   */
  private resetAndRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
      currentStrategyIndex: 0
    });
  };

  /**
   * Set original image for recovery attempts
   */
  public setOriginalImage = (image: CapturedImage) => {
    this.setState({ originalImage: image });
  };

  render() {
    const { hasError, isRecovering, recoveryStrategies, currentStrategyIndex, error } = this.state;
    const { culturalProfile } = this.props;

    if (!hasError) {
      return this.props.children;
    }

    return (
      <Animated.View
        style={[styles.container, { opacity: this.fadeAnimation }]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Error Icon and Title */}
          <View style={styles.header}>
            <Ionicons
              name="warning"
              size={culturalProfile?.accessibility?.largeButtons ? 80 : 64}
              color="#ff6b35"
            />
            <Text style={[
              styles.title,
              culturalProfile?.accessibility?.textSize === 'large' && styles.largeText
            ]}>
              {culturalProfile?.language === 'ms' ? 'Masalah OCR' : 'OCR Problem'}
            </Text>
          </View>

          {/* Error Description */}
          <View style={styles.errorDescription}>
            <Text style={[
              styles.errorText,
              culturalProfile?.accessibility?.textSize === 'large' && styles.largeErrorText
            ]}>
              {culturalProfile?.language === 'ms'
                ? 'Ralat berlaku semasa memproses imej ubat. Kami akan cuba beberapa strategi pemulihan.'
                : 'An error occurred while processing the medication image. We will try several recovery strategies.'}
            </Text>
          </View>

          {/* Recovery Status */}
          {isRecovering && (
            <View style={styles.recoveryStatus}>
              <Ionicons
                name="refresh"
                size={24}
                color="#007AFF"
                style={styles.spinningIcon}
              />
              <Text style={[
                styles.recoveryText,
                culturalProfile?.accessibility?.textSize === 'large' && styles.largeRecoveryText
              ]}>
                {culturalProfile?.language === 'ms'
                  ? `Mencuba strategi ${currentStrategyIndex + 1}/${recoveryStrategies.length}...`
                  : `Trying strategy ${currentStrategyIndex + 1}/${recoveryStrategies.length}...`}
              </Text>
              {recoveryStrategies[currentStrategyIndex] && (
                <Text style={styles.strategyDescription}>
                  {recoveryStrategies[currentStrategyIndex].description}
                </Text>
              )}
            </View>
          )}

          {/* Recovery Strategies */}
          <View style={styles.strategiesContainer}>
            <Text style={[
              styles.strategiesTitle,
              culturalProfile?.accessibility?.textSize === 'large' && styles.largeStrategiesTitle
            ]}>
              {culturalProfile?.language === 'ms' ? 'Strategi Pemulihan:' : 'Recovery Strategies:'}
            </Text>

            {recoveryStrategies.map((strategy, index) => (
              <TouchableOpacity
                key={strategy.id}
                style={[
                  styles.strategyButton,
                  culturalProfile?.accessibility?.largeButtons && styles.largeStrategyButton,
                  index === currentStrategyIndex && isRecovering && styles.activeStrategy,
                  index < currentStrategyIndex && styles.completedStrategy
                ]}
                onPress={() => !isRecovering && this.attemptRecovery(index)}
                disabled={isRecovering}
              >
                <Ionicons
                  name={strategy.icon as any}
                  size={culturalProfile?.accessibility?.largeButtons ? 28 : 20}
                  color={
                    index < currentStrategyIndex ? '#4CAF50' :
                    index === currentStrategyIndex && isRecovering ? '#007AFF' : '#666'
                  }
                />
                <View style={styles.strategyContent}>
                  <Text style={[
                    styles.strategyName,
                    culturalProfile?.accessibility?.textSize === 'large' && styles.largeStrategyName
                  ]}>
                    {strategy.name}
                  </Text>
                  <Text style={styles.strategyDesc}>
                    {strategy.description}
                  </Text>
                </View>
                {index < currentStrategyIndex && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Manual Actions */}
          <View style={styles.manualActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                culturalProfile?.accessibility?.largeButtons && styles.largeActionButton
              ]}
              onPress={() => this.attemptRecovery(0)}
              disabled={isRecovering}
            >
              <Text style={[
                styles.actionButtonText,
                culturalProfile?.accessibility?.textSize === 'large' && styles.largeActionButtonText
              ]}>
                {culturalProfile?.language === 'ms' ? 'Mula Pemulihan' : 'Start Recovery'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                culturalProfile?.accessibility?.largeButtons && styles.largeActionButton
              ]}
              onPress={this.resetAndRetry}
              disabled={isRecovering}
            >
              <Text style={[
                styles.actionButtonText,
                styles.secondaryButtonText,
                culturalProfile?.accessibility?.textSize === 'large' && styles.largeActionButtonText
              ]}>
                {culturalProfile?.language === 'ms' ? 'Ambil Gambar Baru' : 'Take New Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Technical Details (collapsible) */}
          {__DEV__ && error && (
            <View style={styles.technicalDetails}>
              <Text style={styles.technicalTitle}>Technical Details:</Text>
              <Text style={styles.technicalText}>{error.message}</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  content: {
    padding: 20,
    alignItems: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center'
  },
  largeText: {
    fontSize: 28
  },
  errorDescription: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107'
  },
  errorText: {
    fontSize: 16,
    color: '#856404',
    lineHeight: 24,
    textAlign: 'center'
  },
  largeErrorText: {
    fontSize: 18,
    lineHeight: 28
  },
  recoveryStatus: {
    backgroundColor: '#d1ecf1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  spinningIcon: {
    marginBottom: 8
  },
  recoveryText: {
    fontSize: 16,
    color: '#0c5460',
    fontWeight: '600',
    textAlign: 'center'
  },
  largeRecoveryText: {
    fontSize: 18
  },
  strategyDescription: {
    fontSize: 14,
    color: '#0c5460',
    textAlign: 'center',
    marginTop: 5
  },
  strategiesContainer: {
    width: '100%',
    marginBottom: 20
  },
  strategiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  largeStrategiesTitle: {
    fontSize: 20
  },
  strategyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  largeStrategyButton: {
    padding: 18
  },
  activeStrategy: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff'
  },
  completedStrategy: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9'
  },
  strategyContent: {
    flex: 1,
    marginLeft: 12
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  largeStrategyName: {
    fontSize: 18
  },
  strategyDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  manualActions: {
    width: '100%',
    gap: 10
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  largeActionButton: {
    padding: 18
  },
  primaryButton: {
    backgroundColor: '#007AFF'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  largeActionButtonText: {
    fontSize: 18
  },
  secondaryButtonText: {
    color: '#007AFF'
  },
  technicalDetails: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: '100%'
  },
  technicalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5
  },
  technicalText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace'
  }
});

export default OCRErrorBoundary;