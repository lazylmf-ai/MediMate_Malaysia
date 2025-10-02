/**
 * Media Storage Service
 *
 * AWS S3 integration for educational content media storage
 * Handles upload, download, and management of images, videos, and PDFs
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  DeleteObjectCommandInput,
  ListObjectsV2CommandInput,
  HeadObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadFileParams {
  file: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
  fileName?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface ListFilesResult {
  files: FileMetadata[];
  nextToken?: string;
  isTruncated: boolean;
}

export interface MediaStorageConfig {
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class MediaStorageService {
  private static instance: MediaStorageService;
  private s3Client: S3Client;
  private bucket: string;

  // File validation constants
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
  private readonly ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/json'];

  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(config?: MediaStorageConfig) {
    const region = config?.region || process.env.AWS_REGION || 'ap-southeast-1';
    this.bucket = config?.bucket || process.env.AWS_S3_EDUCATION_BUCKET || 'medimatemy-education-content';

    const clientConfig: any = {
      region,
    };

    // Use provided credentials or environment variables
    if (config?.accessKeyId && config?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    } else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  public static getInstance(config?: MediaStorageConfig): MediaStorageService {
    if (!MediaStorageService.instance) {
      MediaStorageService.instance = new MediaStorageService(config);
    }
    return MediaStorageService.instance;
  }

  /**
   * Upload a file to S3 with validation
   */
  async uploadFile(params: UploadFileParams): Promise<UploadResult> {
    const { file, contentType, metadata, fileName } = params;

    // Validate file type
    this.validateFileType(contentType);

    // Validate file size
    this.validateFileSize(file.length, contentType);

    // Generate unique file key
    const key = this.generateFileKey(contentType, fileName);

    try {
      const uploadParams: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata || {},
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Construct the S3 URL
      const url = `https://${this.bucket}.s3.${await this.getRegion()}.amazonaws.com/${key}`;

      return {
        key,
        url,
        bucket: this.bucket,
        size: file.length,
      };
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file from S3
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('No file content received from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to get file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a presigned URL for secure temporary access
   */
  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return url;
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const params: DeleteObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new DeleteObjectCommand(params);
      await this.s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in S3 with optional prefix filter
   */
  async listFiles(prefix?: string, maxKeys: number = 1000, continuationToken?: string): Promise<ListFilesResult> {
    try {
      const params: ListObjectsV2CommandInput = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      };

      const command = new ListObjectsV2Command(params);
      const response = await this.s3Client.send(command);

      const files: FileMetadata[] = [];

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) {
            // Get metadata for each file
            const metadata = await this.getFileMetadata(item.Key);
            files.push(metadata);
          }
        }
      }

      return {
        files,
        nextToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      throw new Error(`Failed to list files from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file metadata without downloading the file
   */
  async getFileMetadata(key: string): Promise<FileMetadata> {
    try {
      const params: HeadObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new HeadObjectCommand(params);
      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata,
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate file type against allowed types
   */
  private validateFileType(contentType: string): void {
    const allowedTypes = [
      ...this.ALLOWED_IMAGE_TYPES,
      ...this.ALLOWED_VIDEO_TYPES,
      ...this.ALLOWED_DOCUMENT_TYPES,
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new Error(
        `Invalid file type: ${contentType}. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate file size based on content type
   */
  private validateFileSize(size: number, contentType: string): void {
    let maxSize: number;

    if (this.ALLOWED_IMAGE_TYPES.includes(contentType)) {
      maxSize = this.MAX_IMAGE_SIZE;
    } else if (this.ALLOWED_VIDEO_TYPES.includes(contentType)) {
      maxSize = this.MAX_VIDEO_SIZE;
    } else if (contentType === 'application/pdf') {
      maxSize = this.MAX_PDF_SIZE;
    } else {
      maxSize = this.MAX_PDF_SIZE; // Default for other document types
    }

    if (size > maxSize) {
      throw new Error(
        `File size ${size} bytes exceeds maximum allowed size of ${maxSize} bytes for type ${contentType}`
      );
    }
  }

  /**
   * Generate a unique file key with proper folder structure
   */
  private generateFileKey(contentType: string, fileName?: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4();

    let folder: string;
    let extension: string;

    if (this.ALLOWED_IMAGE_TYPES.includes(contentType)) {
      folder = 'images';
      extension = contentType.split('/')[1];
    } else if (this.ALLOWED_VIDEO_TYPES.includes(contentType)) {
      folder = 'videos';
      extension = contentType.split('/')[1];
    } else if (contentType === 'application/pdf') {
      folder = 'documents';
      extension = 'pdf';
    } else {
      folder = 'documents';
      extension = 'json';
    }

    // Use provided filename or generate one
    const baseName = fileName
      ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\..*$/, '')
      : `file_${timestamp}`;

    return `${folder}/${baseName}_${uuid}.${extension}`;
  }

  /**
   * Get the AWS region from the S3 client
   */
  private async getRegion(): Promise<string> {
    return (this.s3Client.config.region as any) || 'ap-southeast-1';
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get bucket name (useful for testing)
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    MediaStorageService.instance = null as any;
  }
}

export default MediaStorageService;
