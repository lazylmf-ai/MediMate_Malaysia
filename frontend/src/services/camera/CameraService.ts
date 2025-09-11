/**
 * Camera Service for Medication Photo Capture
 * 
 * Handles camera integration with auto-focus, lighting optimization,
 * and image preprocessing specifically for Malaysian medication labels.
 */

import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { 
  CameraPermissions, 
  CameraConfiguration, 
  PhotoCaptureOptions, 
  CapturedImage,
  ImageMetadata 
} from '../../types/medication';

export class CameraService {
  private static instance: CameraService;
  private permissions: CameraPermissions = {
    camera: false,
    gallery: false,
    storage: false
  };

  private defaultConfig: CameraConfiguration = {
    quality: 'high',
    format: 'jpg',
    enableFlash: false,
    autoFocus: true,
    optimizeForOCR: true
  };

  private constructor() {}

  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  /**
   * Request necessary camera and gallery permissions
   */
  public async requestPermissions(): Promise<CameraPermissions> {
    try {
      // Request camera permissions
      const cameraResult = await Camera.requestCameraPermissionsAsync();
      this.permissions.camera = cameraResult.status === 'granted';

      // Request gallery permissions
      const galleryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      this.permissions.gallery = galleryResult.status === 'granted';

      // Request storage permissions for saving processed images
      const storageResult = await MediaLibrary.requestPermissionsAsync();
      this.permissions.storage = storageResult.status === 'granted';

      return this.permissions;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      throw new Error('Failed to request camera permissions');
    }
  }

  /**
   * Check current permission status
   */
  public async checkPermissions(): Promise<CameraPermissions> {
    try {
      const cameraStatus = await Camera.getCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      const storageStatus = await MediaLibrary.getPermissionsAsync();

      this.permissions = {
        camera: cameraStatus.status === 'granted',
        gallery: galleryStatus.status === 'granted',
        storage: storageStatus.status === 'granted'
      };

      return this.permissions;
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return this.permissions;
    }
  }

  /**
   * Capture photo from camera with OCR optimization
   */
  public async capturePhoto(
    options: Partial<PhotoCaptureOptions> = {}
  ): Promise<CapturedImage> {
    if (!this.permissions.camera) {
      throw new Error('Camera permission not granted');
    }

    const captureOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [4, 3], // Optimal for medication labels
      quality: options.quality ?? 0.8,
      base64: options.base64 ?? false,
      exif: true, // Include metadata
    };

    try {
      const result = await ImagePicker.launchCameraAsync(captureOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        throw new Error('Photo capture cancelled');
      }

      const asset = result.assets[0];
      const metadata = this.extractMetadata(asset);

      const capturedImage: CapturedImage = {
        uri: asset.uri,
        width: asset.width || 0,
        height: asset.height || 0,
        fileSize: asset.fileSize || 0,
        format: this.getImageFormat(asset.uri),
        quality: options.quality ?? 0.8,
        metadata
      };

      return capturedImage;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw new Error('Failed to capture photo');
    }
  }

  /**
   * Import photo from gallery
   */
  public async importFromGallery(
    options: Partial<PhotoCaptureOptions> = {}
  ): Promise<CapturedImage> {
    if (!this.permissions.gallery) {
      throw new Error('Gallery permission not granted');
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [4, 3],
      quality: options.quality ?? 0.8,
      base64: options.base64 ?? false,
      exif: true,
    };

    try {
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        throw new Error('Gallery selection cancelled');
      }

      const asset = result.assets[0];
      const metadata = this.extractMetadata(asset);

      const capturedImage: CapturedImage = {
        uri: asset.uri,
        width: asset.width || 0,
        height: asset.height || 0,
        fileSize: asset.fileSize || 0,
        format: this.getImageFormat(asset.uri),
        quality: options.quality ?? 0.8,
        metadata
      };

      return capturedImage;
    } catch (error) {
      console.error('Error importing from gallery:', error);
      throw new Error('Failed to import from gallery');
    }
  }

  /**
   * Get optimal camera settings for medication label capture
   */
  public getOptimalSettings(): CameraConfiguration {
    return {
      ...this.defaultConfig,
      // Specific optimizations for Malaysian medication labels
      quality: 'high', // High quality for OCR accuracy
      enableFlash: false, // Flash can cause glare on medication packages
      autoFocus: true, // Essential for clear text
      optimizeForOCR: true // Apply OCR-specific enhancements
    };
  }

  /**
   * Validate image quality for OCR processing
   */
  public validateImageForOCR(image: CapturedImage): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check image dimensions
    if (image.width < 800 || image.height < 600) {
      issues.push('Image resolution too low');
      recommendations.push('Capture image at higher resolution');
    }

    // Check file size (too small might indicate poor quality)
    if (image.fileSize < 100000) { // Less than 100KB
      issues.push('Image file size too small, may indicate poor quality');
      recommendations.push('Ensure good lighting and focus before capturing');
    }

    // Check aspect ratio (should be reasonable for medication labels)
    const aspectRatio = image.width / image.height;
    if (aspectRatio < 0.5 || aspectRatio > 3) {
      issues.push('Unusual aspect ratio detected');
      recommendations.push('Try to capture medication label in landscape orientation');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get camera capabilities and settings info
   */
  public async getCameraInfo(): Promise<{
    isAvailable: boolean;
    hasFlash: boolean;
    supportedRatios: string[];
    maxZoom?: number;
  }> {
    try {
      const isAvailable = await Camera.isAvailableAsync();
      
      // Note: Expo Camera API doesn't directly expose flash/zoom info
      // This is a simplified version - in production you might use react-native-vision-camera
      return {
        isAvailable,
        hasFlash: true, // Assume modern devices have flash
        supportedRatios: ['4:3', '16:9', '1:1'],
        maxZoom: 1 // Assume no zoom for simplicity
      };
    } catch (error) {
      console.error('Error getting camera info:', error);
      return {
        isAvailable: false,
        hasFlash: false,
        supportedRatios: [],
        maxZoom: 1
      };
    }
  }

  /**
   * Extract metadata from captured image
   */
  private extractMetadata(asset: ImagePicker.ImagePickerAsset): ImageMetadata {
    return {
      capturedAt: new Date().toISOString(),
      location: asset.exif?.GPS ? {
        latitude: asset.exif.GPS.Latitude || 0,
        longitude: asset.exif.GPS.Longitude || 0
      } : undefined,
      deviceInfo: {
        model: 'Unknown', // Would need expo-device for actual device info
        os: 'Unknown',
        appVersion: '1.0.0'
      },
      cameraSettings: {
        flash: false, // Would need to track flash usage
        focus: 'auto',
        exposure: 0
      }
    };
  }

  /**
   * Determine image format from URI
   */
  private getImageFormat(uri: string): 'jpg' | 'png' {
    const extension = uri.split('.').pop()?.toLowerCase();
    return extension === 'png' ? 'png' : 'jpg';
  }

  /**
   * Clean up temporary images and cache
   */
  public async cleanup(): Promise<void> {
    try {
      // Implementation would clean up any temporary files
      // This is a placeholder for actual cleanup logic
      console.log('Camera service cleanup completed');
    } catch (error) {
      console.error('Error during camera cleanup:', error);
    }
  }
}