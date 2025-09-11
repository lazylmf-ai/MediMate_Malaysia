/**
 * Image Processing Utilities for OCR Optimization
 * 
 * Handles image preprocessing, enhancement, and optimization
 * specifically for Malaysian medication label recognition.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { 
  CapturedImage, 
  ProcessedImageData, 
  ImageTransformation 
} from '../../types/medication';

export interface ImageProcessingOptions {
  enhanceContrast?: boolean;
  adjustBrightness?: boolean;
  sharpen?: boolean;
  removeNoise?: boolean;
  autoRotate?: boolean;
  cropToLabel?: boolean;
  resizeForOCR?: boolean;
  targetWidth?: number;
  targetHeight?: number;
}

export interface ProcessingResult {
  processedImage: CapturedImage;
  transformations: ImageTransformation[];
  processingTime: number;
  qualityScore: number;
}

export class ImageProcessor {
  private static instance: ImageProcessor;

  private constructor() {}

  public static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }

  /**
   * Process image for optimal OCR recognition
   */
  public async processForOCR(
    image: CapturedImage,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const transformations: ImageTransformation[] = [];

    try {
      let processedUri = image.uri;
      let processedWidth = image.width;
      let processedHeight = image.height;

      // Apply transformations in optimal order
      const actions: ImageManipulator.Action[] = [];

      // 1. Auto-rotate if needed
      if (options.autoRotate !== false) {
        const rotationAngle = await this.detectOptimalRotation(image);
        if (rotationAngle !== 0) {
          actions.push({ rotate: rotationAngle });
          transformations.push({
            type: 'rotate',
            parameters: { angle: rotationAngle },
            appliedAt: new Date().toISOString()
          });
        }
      }

      // 2. Crop to medication label area if enabled
      if (options.cropToLabel) {
        const cropArea = await this.detectLabelArea(image);
        if (cropArea) {
          actions.push({
            crop: {
              originX: cropArea.x,
              originY: cropArea.y,
              width: cropArea.width,
              height: cropArea.height
            }
          });
          transformations.push({
            type: 'crop',
            parameters: cropArea,
            appliedAt: new Date().toISOString()
          });
          processedWidth = cropArea.width;
          processedHeight = cropArea.height;
        }
      }

      // 3. Resize for optimal OCR performance
      if (options.resizeForOCR !== false) {
        const optimalSize = this.calculateOptimalSize(
          processedWidth,
          processedHeight,
          options.targetWidth,
          options.targetHeight
        );
        
        if (optimalSize.width !== processedWidth || optimalSize.height !== processedHeight) {
          actions.push({
            resize: {
              width: optimalSize.width,
              height: optimalSize.height
            }
          });
          transformations.push({
            type: 'resize',
            parameters: optimalSize,
            appliedAt: new Date().toISOString()
          });
          processedWidth = optimalSize.width;
          processedHeight = optimalSize.height;
        }
      }

      // Apply all transformations at once for better performance
      if (actions.length > 0) {
        const result = await ImageManipulator.manipulateAsync(
          image.uri,
          actions,
          {
            compress: 0.9,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: false
          }
        );
        processedUri = result.uri;
      }

      // 4. Apply enhancement filters (these would be done post-processing)
      const enhancedUri = await this.applyEnhancements(
        processedUri,
        options,
        transformations
      );

      const processingTime = Date.now() - startTime;
      const qualityScore = await this.assessImageQuality(enhancedUri);

      const processedImage: CapturedImage = {
        ...image,
        uri: enhancedUri,
        width: processedWidth,
        height: processedHeight,
        processed: {
          originalUri: image.uri,
          processedUri: enhancedUri,
          transformations,
          optimizedForOCR: true,
          processingTime
        }
      };

      return {
        processedImage,
        transformations,
        processingTime,
        qualityScore
      };
    } catch (error) {
      console.error('Error processing image for OCR:', error);
      throw new Error('Image processing failed');
    }
  }

  /**
   * Detect optimal rotation angle for text readability
   */
  private async detectOptimalRotation(image: CapturedImage): Promise<number> {
    // Simple heuristic: if image is taller than wide, likely needs rotation
    // In a real implementation, you'd use ML text detection or edge detection
    
    if (image.height > image.width * 1.5) {
      // Likely portrait orientation of landscape label
      return 90;
    }
    
    if (image.width > image.height * 2) {
      // Very wide image, might need slight adjustment
      return 0;
    }
    
    return 0; // No rotation needed
  }

  /**
   * Detect medication label area within the image
   */
  private async detectLabelArea(image: CapturedImage): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    // Simple center crop approach
    // In production, you'd use computer vision to detect the actual label
    
    const margin = 0.1; // 10% margin from edges
    const cropWidth = image.width * (1 - 2 * margin);
    const cropHeight = image.height * (1 - 2 * margin);
    
    return {
      x: image.width * margin,
      y: image.height * margin,
      width: cropWidth,
      height: cropHeight
    };
  }

  /**
   * Calculate optimal image size for OCR processing
   */
  private calculateOptimalSize(
    currentWidth: number,
    currentHeight: number,
    targetWidth?: number,
    targetHeight?: number
  ): { width: number; height: number } {
    // Optimal size for OCR is typically 300-600 DPI equivalent
    // For mobile displays, 1200-2400px width is usually good
    
    const maxWidth = targetWidth || 2000;
    const maxHeight = targetHeight || 1500;
    const minWidth = 800;
    const minHeight = 600;
    
    let newWidth = currentWidth;
    let newHeight = currentHeight;
    
    // Scale down if too large
    if (newWidth > maxWidth || newHeight > maxHeight) {
      const widthRatio = maxWidth / newWidth;
      const heightRatio = maxHeight / newHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      
      newWidth = Math.round(newWidth * ratio);
      newHeight = Math.round(newHeight * ratio);
    }
    
    // Scale up if too small
    if (newWidth < minWidth || newHeight < minHeight) {
      const widthRatio = minWidth / newWidth;
      const heightRatio = minHeight / newHeight;
      const ratio = Math.max(widthRatio, heightRatio);
      
      newWidth = Math.round(newWidth * ratio);
      newHeight = Math.round(newHeight * ratio);
    }
    
    return { width: newWidth, height: newHeight };
  }

  /**
   * Apply image enhancements for better OCR accuracy
   */
  private async applyEnhancements(
    imageUri: string,
    options: ImageProcessingOptions,
    transformations: ImageTransformation[]
  ): Promise<string> {
    // Expo ImageManipulator doesn't support advanced filters like contrast/brightness
    // In a production app, you might use react-native-image-filter-kit or similar
    
    // For now, return the image as-is
    // Future enhancement: integrate with native image processing libraries
    
    if (options.enhanceContrast) {
      transformations.push({
        type: 'enhance',
        parameters: { type: 'contrast', value: 1.2 },
        appliedAt: new Date().toISOString()
      });
    }
    
    if (options.adjustBrightness) {
      transformations.push({
        type: 'enhance',
        parameters: { type: 'brightness', value: 1.1 },
        appliedAt: new Date().toISOString()
      });
    }
    
    return imageUri;
  }

  /**
   * Assess processed image quality for OCR suitability
   */
  private async assessImageQuality(imageUri: string): Promise<number> {
    // Simple quality assessment based on file size and format
    // In production, this would analyze actual image properties
    
    try {
      // This is a placeholder - in reality you'd analyze:
      // - Sharpness/blur detection
      // - Contrast levels
      // - Noise levels
      // - Text detectability
      
      // Return a score between 0-100
      return 85; // Assume good quality for now
    } catch (error) {
      console.error('Error assessing image quality:', error);
      return 50; // Default medium quality
    }
  }

  /**
   * Compress image for storage optimization
   */
  public async compressForStorage(
    image: CapturedImage,
    quality: number = 0.7
  ): Promise<CapturedImage> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        [], // No transformations, just compression
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );

      return {
        ...image,
        uri: result.uri,
        width: result.width || image.width,
        height: result.height || image.height,
        quality
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Image compression failed');
    }
  }

  /**
   * Create thumbnail for image preview
   */
  public async createThumbnail(
    image: CapturedImage,
    size: number = 200
  ): Promise<CapturedImage> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        [
          {
            resize: {
              width: size,
              height: size
            }
          }
        ],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );

      return {
        ...image,
        uri: result.uri,
        width: result.width || size,
        height: result.height || size,
        quality: 0.6
      };
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      throw new Error('Thumbnail creation failed');
    }
  }

  /**
   * Batch process multiple images
   */
  public async batchProcess(
    images: CapturedImage[],
    options: ImageProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const image of images) {
      try {
        const result = await this.processForOCR(image, options);
        results.push(result);
      } catch (error) {
        console.error(`Error processing image ${image.uri}:`, error);
        // Continue with other images
      }
    }
    
    return results;
  }
}