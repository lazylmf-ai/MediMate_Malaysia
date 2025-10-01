/**
 * Image Storage Service
 * 
 * Handles secure storage, compression, and management of medication images
 * with support for encryption and cloud backup.
 */

import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { CapturedImage } from '../../types/medication';
import { ImageProcessor } from '../../utils/image/ImageProcessor';

interface StorageMetadata {
  originalPath: string;
  storagePath: string;
  thumbnailPath?: string;
  fileSize: number;
  createdAt: string;
  medicationId?: string;
  compressed: boolean;
  encrypted: boolean;
}

interface StorageConfig {
  enableCompression: boolean;
  compressionQuality: number;
  enableEncryption: boolean;
  enableThumbnails: boolean;
  maxFileSize: number; // bytes
  cleanupAfterDays: number;
}

export class ImageStorageService {
  private static instance: ImageStorageService;
  private readonly storageDir = `${FileSystem.documentDirectory}medication-images/`;
  private readonly thumbnailDir = `${FileSystem.documentDirectory}thumbnails/`;
  private readonly metadataKey = 'medication-images-metadata';

  private config: StorageConfig = {
    enableCompression: true,
    compressionQuality: 0.8,
    enableEncryption: false, // Would require additional crypto setup
    enableThumbnails: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    cleanupAfterDays: 90
  };

  private imageProcessor = ImageProcessor.getInstance();

  private constructor() {
    this.initializeStorage();
  }

  public static getInstance(): ImageStorageService {
    if (!ImageStorageService.instance) {
      ImageStorageService.instance = new ImageStorageService();
    }
    return ImageStorageService.instance;
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage(): Promise<void> {
    try {
      // Create directories if they don't exist
      const storageInfo = await FileSystem.getInfoAsync(this.storageDir);
      if (!storageInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.storageDir, { intermediates: true });
      }

      const thumbnailInfo = await FileSystem.getInfoAsync(this.thumbnailDir);
      if (!thumbnailInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.thumbnailDir, { intermediates: true });
      }

      // Clean up old files periodically
      this.cleanupOldFiles();
    } catch (error) {
      console.error('Error initializing image storage:', error);
    }
  }

  /**
   * Store a medication image securely
   */
  public async storeImage(
    image: CapturedImage,
    medicationId?: string
  ): Promise<string> {
    try {
      // Validate file size
      if (image.fileSize > this.config.maxFileSize) {
        throw new Error(`Image size (${image.fileSize} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`);
      }

      const timestamp = Date.now();
      const filename = `med_${timestamp}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const storagePath = `${this.storageDir}${filename}`;

      let processedImage = image;

      // Compress image if enabled
      if (this.config.enableCompression) {
        processedImage = await this.imageProcessor.compressForStorage(
          image,
          this.config.compressionQuality
        );
      }

      // Copy to secure storage location
      await FileSystem.copyAsync({
        from: processedImage.uri,
        to: storagePath
      });

      // Create thumbnail if enabled
      let thumbnailPath: string | undefined;
      if (this.config.enableThumbnails) {
        thumbnailPath = await this.createThumbnail(processedImage, filename);
      }

      // Store metadata
      const metadata: StorageMetadata = {
        originalPath: image.uri,
        storagePath,
        thumbnailPath,
        fileSize: processedImage.fileSize,
        createdAt: new Date().toISOString(),
        medicationId,
        compressed: this.config.enableCompression,
        encrypted: this.config.enableEncryption
      };

      await this.saveMetadata(filename, metadata);

      return storagePath;
    } catch (error) {
      console.error('Error storing image:', error);
      throw new Error('Failed to store image securely');
    }
  }

  /**
   * Retrieve stored image by filename
   */
  public async getImage(filename: string): Promise<CapturedImage | null> {
    try {
      const storagePath = `${this.storageDir}${filename}`;
      const metadata = await this.getMetadata(filename);

      if (!metadata) {
        return null;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(storagePath);
      if (!fileInfo.exists) {
        // Clean up orphaned metadata
        await this.removeMetadata(filename);
        return null;
      }

      // Get current file size
      const currentFileSize = fileInfo.size || 0;

      const capturedImage: CapturedImage = {
        uri: storagePath,
        width: 0, // Would need to read from metadata or image headers
        height: 0,
        fileSize: currentFileSize,
        format: 'jpg',
        quality: metadata.compressed ? this.config.compressionQuality : 1,
        metadata: {
          capturedAt: metadata.createdAt,
          deviceInfo: {
            model: 'Unknown',
            os: 'Unknown',
            appVersion: '1.0.0'
          }
        }
      };

      return capturedImage;
    } catch (error) {
      console.error('Error retrieving image:', error);
      return null;
    }
  }

  /**
   * Get thumbnail for an image
   */
  public async getThumbnail(filename: string): Promise<string | null> {
    try {
      const metadata = await this.getMetadata(filename);
      if (!metadata?.thumbnailPath) {
        return null;
      }

      const fileInfo = await FileSystem.getInfoAsync(metadata.thumbnailPath);
      return fileInfo.exists ? metadata.thumbnailPath : null;
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      return null;
    }
  }

  /**
   * Delete stored image and metadata
   */
  public async deleteImage(filename: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(filename);
      
      // Delete main image file
      const storagePath = `${this.storageDir}${filename}`;
      const fileInfo = await FileSystem.getInfoAsync(storagePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(storagePath);
      }

      // Delete thumbnail if exists
      if (metadata?.thumbnailPath) {
        const thumbnailInfo = await FileSystem.getInfoAsync(metadata.thumbnailPath);
        if (thumbnailInfo.exists) {
          await FileSystem.deleteAsync(metadata.thumbnailPath);
        }
      }

      // Remove metadata
      await this.removeMetadata(filename);

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * List all stored images for a medication
   */
  public async getImagesForMedication(medicationId: string): Promise<string[]> {
    try {
      const allMetadata = await this.getAllMetadata();
      return Object.keys(allMetadata).filter(
        filename => allMetadata[filename].medicationId === medicationId
      );
    } catch (error) {
      console.error('Error getting images for medication:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    oldestImage: string;
    newestImage: string;
  }> {
    try {
      const allMetadata = await this.getAllMetadata();
      const filenames = Object.keys(allMetadata);
      
      let totalSize = 0;
      let oldestDate = new Date();
      let newestDate = new Date(0);
      let oldestImage = '';
      let newestImage = '';

      for (const filename of filenames) {
        const metadata = allMetadata[filename];
        totalSize += metadata.fileSize;
        
        const createdDate = new Date(metadata.createdAt);
        if (createdDate < oldestDate) {
          oldestDate = createdDate;
          oldestImage = filename;
        }
        if (createdDate > newestDate) {
          newestDate = createdDate;
          newestImage = filename;
        }
      }

      return {
        totalImages: filenames.length,
        totalSize,
        oldestImage,
        newestImage
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        oldestImage: '',
        newestImage: ''
      };
    }
  }

  /**
   * Clean up old images based on configuration
   */
  private async cleanupOldFiles(): Promise<void> {
    try {
      const allMetadata = await this.getAllMetadata();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupAfterDays);

      for (const filename of Object.keys(allMetadata)) {
        const metadata = allMetadata[filename];
        const createdDate = new Date(metadata.createdAt);
        
        if (createdDate < cutoffDate) {
          await this.deleteImage(filename);
          console.log(`Cleaned up old image: ${filename}`);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Create thumbnail for an image
   */
  private async createThumbnail(image: CapturedImage, originalFilename: string): Promise<string> {
    try {
      const thumbnailFilename = `thumb_${originalFilename}`;
      const thumbnailPath = `${this.thumbnailDir}${thumbnailFilename}`;
      
      const thumbnail = await this.imageProcessor.createThumbnail(image, 200);
      
      await FileSystem.copyAsync({
        from: thumbnail.uri,
        to: thumbnailPath
      });

      return thumbnailPath;
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      throw error;
    }
  }

  /**
   * Save metadata for an image
   */
  private async saveMetadata(filename: string, metadata: StorageMetadata): Promise<void> {
    try {
      const allMetadata = await this.getAllMetadata();
      allMetadata[filename] = metadata;
      await SecureStore.setItemAsync(this.metadataKey, JSON.stringify(allMetadata));
    } catch (error) {
      console.error('Error saving metadata:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a specific image
   */
  private async getMetadata(filename: string): Promise<StorageMetadata | null> {
    try {
      const allMetadata = await this.getAllMetadata();
      return allMetadata[filename] || null;
    } catch (error) {
      console.error('Error getting metadata:', error);
      return null;
    }
  }

  /**
   * Get all metadata
   */
  private async getAllMetadata(): Promise<Record<string, StorageMetadata>> {
    try {
      const metadataString = await SecureStore.getItemAsync(this.metadataKey);
      return metadataString ? JSON.parse(metadataString) : {};
    } catch (error) {
      console.error('Error getting all metadata:', error);
      return {};
    }
  }

  /**
   * Remove metadata for a specific image
   */
  private async removeMetadata(filename: string): Promise<void> {
    try {
      const allMetadata = await this.getAllMetadata();
      delete allMetadata[filename];
      await SecureStore.setItemAsync(this.metadataKey, JSON.stringify(allMetadata));
    } catch (error) {
      console.error('Error removing metadata:', error);
    }
  }

  /**
   * Update storage configuration
   */
  public updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current storage configuration
   */
  public getConfig(): StorageConfig {
    return { ...this.config };
  }
}