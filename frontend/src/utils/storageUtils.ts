/**
 * Storage Utility Functions
 *
 * Helper functions for storage management, formatting, and calculations
 * for the education offline storage service.
 */

import type { EducationStorageStats } from '@/types/offline';

/**
 * Format bytes to human-readable string (MB/GB)
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "150.25 MB", "1.5 GB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';

  const MB = 1024 * 1024;
  const GB = 1024 * 1024 * 1024;

  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(2)} GB`;
  } else {
    return `${(bytes / MB).toFixed(2)} MB`;
  }
}

/**
 * Calculate storage percentage used
 * @param used - Bytes used
 * @param total - Total bytes available
 * @returns Percentage (0-100)
 */
export function calculateStoragePercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

/**
 * Check if enough storage is available
 * @param stats - Storage statistics
 * @param requiredMB - Required space in megabytes
 * @returns True if enough space available
 */
export function isStorageAvailable(stats: EducationStorageStats, requiredMB: number): boolean {
  const requiredBytes = requiredMB * 1024 * 1024;
  return stats.available >= requiredBytes;
}

/**
 * Calculate expiry date based on TTL (time-to-live)
 * @param ttlDays - Number of days until expiry
 * @returns ISO date string of expiry date
 */
export function calculateExpiryDate(ttlDays: number): string {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + ttlDays);
  return expiryDate.toISOString();
}

/**
 * Check if content has expired
 * @param expiryDate - ISO date string of expiry
 * @returns True if expired
 */
export function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

/**
 * Convert megabytes to bytes
 * @param mb - Megabytes
 * @returns Bytes
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

/**
 * Convert bytes to megabytes
 * @param bytes - Bytes
 * @returns Megabytes
 */
export function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

/**
 * Get storage level indicator (low, medium, high)
 * @param stats - Storage statistics
 * @returns Storage level
 */
export function getStorageLevel(stats: EducationStorageStats): 'low' | 'medium' | 'high' {
  const percentage = calculateStoragePercentage(stats.used, stats.total);

  if (percentage < 50) return 'low';
  if (percentage < 80) return 'medium';
  return 'high';
}

/**
 * Calculate remaining days until expiry
 * @param expiryDate - ISO date string of expiry
 * @returns Number of days remaining (0 if expired)
 */
export function getRemainingDays(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Format duration in seconds to readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "5m 30s", "1h 15m")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Validate file extension for content type
 * @param fileName - File name with extension
 * @param contentType - Expected content type
 * @returns True if extension matches content type
 */
export function validateFileExtension(fileName: string, contentType: 'article' | 'video'): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (contentType === 'article') {
    return extension === 'json';
  } else if (contentType === 'video') {
    return extension === 'mp4';
  }

  return false;
}

/**
 * Generate safe file name from content ID and type
 * @param contentId - Content ID
 * @param type - Content type
 * @returns Safe file name
 */
export function generateFileName(contentId: string, type: 'article' | 'video'): string {
  const safeId = contentId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const extension = type === 'video' ? 'mp4' : 'json';
  return `${safeId}.${extension}`;
}
