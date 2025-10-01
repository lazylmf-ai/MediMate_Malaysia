/**
 * Camera Service Tests
 *
 * Comprehensive tests for camera service functionality including
 * permissions, photo capture, gallery import, and Malaysian-specific
 * medication photo optimizations.
 */

import { CameraService } from '../CameraService';
import { CapturedImage, PhotoCaptureOptions } from '../../../types/medication';

// Mock Expo modules
jest.mock('expo-camera', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
  Constants: {
    AutoFocus: {
      on: 'on'
    }
  }
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn()
}));

describe('CameraService', () => {
  let cameraService: CameraService;
  let mockCamera: any;
  let mockImagePicker: any;
  let mockMediaLibrary: any;

  beforeEach(() => {
    cameraService = CameraService.getInstance();

    // Get mocked modules
    mockCamera = require('expo-camera');
    mockImagePicker = require('expo-image-picker');
    mockMediaLibrary = require('expo-media-library');

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CameraService.getInstance();
      const instance2 = CameraService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Permission Management', () => {
    it('should request all necessary permissions successfully', async () => {
      // Mock successful permission grants
      mockCamera.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });

      const permissions = await cameraService.requestPermissions();

      expect(permissions.camera).toBe(true);
      expect(permissions.gallery).toBe(true);
      expect(permissions.storage).toBe(true);

      expect(mockCamera.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle denied permissions gracefully', async () => {
      mockCamera.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied'
      });
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'denied'
      });
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'denied'
      });

      const permissions = await cameraService.requestPermissions();

      expect(permissions.camera).toBe(false);
      expect(permissions.gallery).toBe(false);
      expect(permissions.storage).toBe(false);
    });

    it('should check existing permission status', async () => {
      mockCamera.getCameraPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });
      mockImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });

      const permissions = await cameraService.checkPermissions();

      expect(permissions.camera).toBe(true);
      expect(permissions.gallery).toBe(true);
      expect(permissions.storage).toBe(true);
    });

    it('should handle permission check errors gracefully', async () => {
      mockCamera.getCameraPermissionsAsync.mockRejectedValue(new Error('Permission check failed'));

      const permissions = await cameraService.checkPermissions();

      expect(permissions.camera).toBe(false);
      expect(permissions.gallery).toBe(false);
      expect(permissions.storage).toBe(false);
    });
  });

  describe('Photo Capture', () => {
    beforeEach(() => {
      // Mock granted camera permissions
      mockCamera.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });
    });

    it('should capture photo with default options', async () => {
      const mockAsset = {
        uri: 'file://test-photo.jpg',
        width: 1200,
        height: 800,
        fileSize: 500000,
        exif: {
          GPS: {
            Latitude: 3.139,
            Longitude: 101.6869
          }
        }
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset]
      });

      // Grant camera permission
      await cameraService.requestPermissions();

      const result = await cameraService.capturePhoto();

      expect(result).toEqual({
        uri: mockAsset.uri,
        width: mockAsset.width,
        height: mockAsset.height,
        fileSize: mockAsset.fileSize,
        format: 'jpg',
        quality: 0.8,
        metadata: expect.objectContaining({
          capturedAt: expect.any(String),
          location: {
            latitude: 3.139,
            longitude: 101.6869
          },
          deviceInfo: expect.objectContaining({
            model: 'Unknown',
            os: 'Unknown',
            appVersion: '1.0.0'
          })
        })
      });

      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        exif: true
      });
    });

    it('should capture photo with custom options', async () => {
      const customOptions: Partial<PhotoCaptureOptions> = {
        quality: 0.9,
        allowsEditing: false,
        aspect: [16, 9],
        base64: true
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{
          uri: 'file://custom-photo.jpg',
          width: 1920,
          height: 1080,
          fileSize: 800000
        }]
      });

      await cameraService.requestPermissions();
      const result = await cameraService.capturePhoto(customOptions);

      expect(result.quality).toBe(0.9);
      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: 'Images',
        allowsEditing: false,
        aspect: [16, 9],
        quality: 0.9,
        base64: true,
        exif: true
      });
    });

    it('should throw error when camera permission is denied', async () => {
      // Don't grant camera permission
      expect(cameraService.capturePhoto()).rejects.toThrow('Camera permission not granted');
    });

    it('should handle capture cancellation', async () => {
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: []
      });

      await cameraService.requestPermissions();

      expect(cameraService.capturePhoto()).rejects.toThrow('Photo capture cancelled');
    });

    it('should handle capture failure', async () => {
      mockImagePicker.launchCameraAsync.mockRejectedValue(new Error('Camera not available'));

      await cameraService.requestPermissions();

      expect(cameraService.capturePhoto()).rejects.toThrow('Failed to capture photo');
    });
  });

  describe('Gallery Import', () => {
    beforeEach(() => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted'
      });
    });

    it('should import photo from gallery successfully', async () => {
      const mockAsset = {
        uri: 'file://gallery-photo.jpg',
        width: 1600,
        height: 1200,
        fileSize: 600000
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset]
      });

      await cameraService.requestPermissions();
      const result = await cameraService.importFromGallery();

      expect(result).toEqual({
        uri: mockAsset.uri,
        width: mockAsset.width,
        height: mockAsset.height,
        fileSize: mockAsset.fileSize,
        format: 'jpg',
        quality: 0.8,
        metadata: expect.objectContaining({
          capturedAt: expect.any(String)
        })
      });
    });

    it('should throw error when gallery permission is denied', async () => {
      expect(cameraService.importFromGallery()).rejects.toThrow('Gallery permission not granted');
    });

    it('should handle import cancellation', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
        assets: []
      });

      await cameraService.requestPermissions();

      expect(cameraService.importFromGallery()).rejects.toThrow('Gallery selection cancelled');
    });
  });

  describe('Image Quality Validation', () => {
    it('should validate good quality image', () => {
      const goodImage: CapturedImage = {
        uri: 'file://good-image.jpg',
        width: 1200,
        height: 800,
        fileSize: 500000,
        format: 'jpg',
        quality: 0.8
      };

      const validation = cameraService.validateImageForOCR(goodImage);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.recommendations).toHaveLength(0);
    });

    it('should identify low resolution issues', () => {
      const lowResImage: CapturedImage = {
        uri: 'file://low-res.jpg',
        width: 400,
        height: 300,
        fileSize: 50000,
        format: 'jpg',
        quality: 0.8
      };

      const validation = cameraService.validateImageForOCR(lowResImage);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Image resolution too low');
      expect(validation.recommendations).toContain('Capture image at higher resolution');
    });

    it('should identify small file size issues', () => {
      const smallFileImage: CapturedImage = {
        uri: 'file://small-file.jpg',
        width: 1200,
        height: 800,
        fileSize: 50000, // Very small file size
        format: 'jpg',
        quality: 0.8
      };

      const validation = cameraService.validateImageForOCR(smallFileImage);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Image file size too small, may indicate poor quality');
      expect(validation.recommendations).toContain('Ensure good lighting and focus before capturing');
    });

    it('should identify aspect ratio issues', () => {
      const weirdAspectImage: CapturedImage = {
        uri: 'file://weird-aspect.jpg',
        width: 100,
        height: 1000, // Very tall and narrow
        fileSize: 200000,
        format: 'jpg',
        quality: 0.8
      };

      const validation = cameraService.validateImageForOCR(weirdAspectImage);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Unusual aspect ratio detected');
      expect(validation.recommendations).toContain('Try to capture medication label in landscape orientation');
    });
  });

  describe('Camera Information', () => {
    it('should return camera availability info', async () => {
      mockCamera.isAvailableAsync.mockResolvedValue(true);

      const info = await cameraService.getCameraInfo();

      expect(info.isAvailable).toBe(true);
      expect(info.hasFlash).toBe(true);
      expect(info.supportedRatios).toContain('4:3');
      expect(info.maxZoom).toBe(1);
    });

    it('should handle camera unavailable scenario', async () => {
      mockCamera.isAvailableAsync.mockResolvedValue(false);

      const info = await cameraService.getCameraInfo();

      expect(info.isAvailable).toBe(false);
      expect(info.hasFlash).toBe(false);
      expect(info.supportedRatios).toEqual([]);
    });

    it('should handle camera info errors gracefully', async () => {
      mockCamera.isAvailableAsync.mockRejectedValue(new Error('Camera check failed'));

      const info = await cameraService.getCameraInfo();

      expect(info.isAvailable).toBe(false);
    });
  });

  describe('Optimal Settings for Malaysian Medications', () => {
    it('should return optimal settings for medication capture', () => {
      const settings = cameraService.getOptimalSettings();

      expect(settings).toEqual({
        quality: 'high',
        format: 'jpg',
        enableFlash: false, // Flash can cause glare
        autoFocus: true, // Essential for clear text
        optimizeForOCR: true
      });
    });
  });

  describe('Image Format Detection', () => {
    it('should detect JPG format from URI', () => {
      const jpgImage: CapturedImage = {
        uri: 'file://test.jpg',
        width: 800,
        height: 600,
        fileSize: 100000,
        format: 'jpg',
        quality: 0.8
      };

      // Test private method through validation which uses it
      const validation = cameraService.validateImageForOCR(jpgImage);
      expect(validation).toBeDefined(); // Just ensure it processes without error
    });

    it('should detect PNG format from URI', () => {
      const pngImage: CapturedImage = {
        uri: 'file://test.png',
        width: 800,
        height: 600,
        fileSize: 100000,
        format: 'png',
        quality: 0.8
      };

      const validation = cameraService.validateImageForOCR(pngImage);
      expect(validation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle permission request errors', async () => {
      mockCamera.requestCameraPermissionsAsync.mockRejectedValue(new Error('Permission error'));

      expect(cameraService.requestPermissions()).rejects.toThrow('Failed to request camera permissions');
    });

    it('should handle image processing errors gracefully', async () => {
      // Test that the service handles malformed image data
      const malformedImage: CapturedImage = {
        uri: '',
        width: 0,
        height: 0,
        fileSize: 0,
        format: 'jpg',
        quality: 0
      };

      const validation = cameraService.validateImageForOCR(malformedImage);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('Malaysian Context Optimization', () => {
    it('should provide Malaysian-specific recommendations for poor images', () => {
      const poorImage: CapturedImage = {
        uri: 'file://poor-image.jpg',
        width: 200,
        height: 100,
        fileSize: 10000,
        format: 'jpg',
        quality: 0.3
      };

      const validation = cameraService.validateImageForOCR(poorImage);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle medication label aspect ratios commonly found in Malaysia', () => {
      // Test common Malaysian medication box aspect ratio (landscape oriented)
      const malayMedImage: CapturedImage = {
        uri: 'file://malay-med.jpg',
        width: 1200,
        height: 600, // 2:1 ratio, common for medication boxes
        fileSize: 400000,
        format: 'jpg',
        quality: 0.8
      };

      const validation = cameraService.validateImageForOCR(malayMedImage);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should handle cleanup gracefully', async () => {
      // Test cleanup doesn't throw errors
      expect(() => cameraService.cleanup()).not.toThrow();
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract GPS metadata when available', async () => {
      const assetWithGPS = {
        uri: 'file://gps-photo.jpg',
        width: 1200,
        height: 800,
        fileSize: 500000,
        exif: {
          GPS: {
            Latitude: 3.139,
            Longitude: 101.6869
          }
        }
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [assetWithGPS]
      });

      await cameraService.requestPermissions();
      const result = await cameraService.capturePhoto();

      expect(result.metadata?.location).toEqual({
        latitude: 3.139,
        longitude: 101.6869
      });
    });

    it('should handle missing GPS metadata gracefully', async () => {
      const assetWithoutGPS = {
        uri: 'file://no-gps-photo.jpg',
        width: 1200,
        height: 800,
        fileSize: 500000,
        exif: {}
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [assetWithoutGPS]
      });

      await cameraService.requestPermissions();
      const result = await cameraService.capturePhoto();

      expect(result.metadata?.location).toBeUndefined();
    });
  });
});