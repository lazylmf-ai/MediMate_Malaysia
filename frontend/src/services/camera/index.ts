/**
 * Camera Services Index
 * 
 * Exports all camera-related services for medication photo capture,
 * processing, and storage functionality.
 */

export { CameraService } from './CameraService';
export { ImageStorageService } from './ImageStorageService';

// Re-export types from medication types
export type {
  CameraPermissions,
  CameraConfiguration,
  PhotoCaptureOptions
} from '../../types/medication';