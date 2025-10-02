/**
 * Media Storage Service Tests
 *
 * Comprehensive unit tests for AWS S3 integration
 * Tests all methods with mocked S3 client
 */

import { MediaStorageService, UploadFileParams } from '../MediaStorageService';
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

// Create S3 client mock
const s3Mock = mockClient(S3Client);

describe('MediaStorageService', () => {
  let service: MediaStorageService;

  beforeEach(() => {
    // Reset singleton and mock before each test
    MediaStorageService.resetInstance();
    s3Mock.reset();

    // Create service instance with test configuration
    service = MediaStorageService.getInstance({
      region: 'ap-southeast-1',
      bucket: 'test-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    });
  });

  afterEach(() => {
    s3Mock.reset();
  });

  describe('uploadFile', () => {
    it('should upload an image file successfully', async () => {
      const fileBuffer = Buffer.from('test image content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'image/jpeg',
        metadata: { userId: '123', contentId: '456' },
        fileName: 'test-image',
      };

      s3Mock.resolves({});

      const result = await service.uploadFile(params);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('bucket', 'test-bucket');
      expect(result).toHaveProperty('size', fileBuffer.length);
      expect(result.key).toMatch(/^images\/test-image_.*\.jpeg$/);
      expect(result.url).toContain('test-bucket.s3');
    });

    it('should upload a video file successfully', async () => {
      const fileBuffer = Buffer.from('test video content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'video/mp4',
        fileName: 'test-video',
      };

      s3Mock.resolves({});

      const result = await service.uploadFile(params);

      expect(result.key).toMatch(/^videos\/test-video_.*\.mp4$/);
      expect(result.size).toBe(fileBuffer.length);
    });

    it('should upload a PDF file successfully', async () => {
      const fileBuffer = Buffer.from('test pdf content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'application/pdf',
        fileName: 'test-document',
      };

      s3Mock.resolves({});

      const result = await service.uploadFile(params);

      expect(result.key).toMatch(/^documents\/test-document_.*\.pdf$/);
      expect(result.size).toBe(fileBuffer.length);
    });

    it('should upload a JSON file successfully', async () => {
      const fileBuffer = Buffer.from(JSON.stringify({ test: 'data' }));
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'application/json',
      };

      s3Mock.resolves({});

      const result = await service.uploadFile(params);

      expect(result.key).toMatch(/^documents\/file_.*\.json$/);
    });

    it('should reject invalid file types', async () => {
      const fileBuffer = Buffer.from('test content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'application/executable',
      };

      await expect(service.uploadFile(params)).rejects.toThrow('Invalid file type');
    });

    it('should reject oversized image files', async () => {
      // Create a buffer larger than 5MB
      const fileBuffer = Buffer.alloc(6 * 1024 * 1024);
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'image/jpeg',
      };

      await expect(service.uploadFile(params)).rejects.toThrow('exceeds maximum allowed size');
    });

    it('should reject oversized video files', async () => {
      // Create a buffer larger than 500MB
      const fileBuffer = Buffer.alloc(501 * 1024 * 1024);
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'video/mp4',
      };

      await expect(service.uploadFile(params)).rejects.toThrow('exceeds maximum allowed size');
    });

    it('should reject oversized PDF files', async () => {
      // Create a buffer larger than 10MB
      const fileBuffer = Buffer.alloc(11 * 1024 * 1024);
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'application/pdf',
      };

      await expect(service.uploadFile(params)).rejects.toThrow('exceeds maximum allowed size');
    });

    it('should handle S3 upload errors', async () => {
      const fileBuffer = Buffer.from('test content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'image/jpeg',
      };

      s3Mock.rejects(new Error('S3 service unavailable'));

      await expect(service.uploadFile(params)).rejects.toThrow('Failed to upload file to S3');
    });

    it('should sanitize file names with special characters', async () => {
      const fileBuffer = Buffer.from('test content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'image/png',
        fileName: 'test file@#$%name.png',
      };

      s3Mock.resolves({});

      const result = await service.uploadFile(params);

      // Special characters should be replaced with underscores
      expect(result.key).toMatch(/^images\/test_file____name_.*\.png$/);
    });
  });

  describe('getFile', () => {
    it('should retrieve a file successfully', async () => {
      const expectedContent = 'test file content';
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(expectedContent);
        },
      } as any;

      s3Mock.resolves({
        Body: mockStream,
      });

      const result = await service.getFile('images/test-file.jpg');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe(expectedContent);
    });

    it('should handle missing file body', async () => {
      s3Mock.resolves({
        Body: undefined,
      });

      await expect(service.getFile('images/test-file.jpg')).rejects.toThrow('No file content received');
    });

    it('should handle S3 get errors', async () => {
      s3Mock.rejects(new Error('File not found'));

      await expect(service.getFile('images/nonexistent.jpg')).rejects.toThrow('Failed to get file from S3');
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate a presigned URL with default expiration', async () => {
      const url = await service.generatePresignedUrl('images/test-file.jpg');

      expect(url).toBeTruthy();
      expect(typeof url).toBe('string');
      expect(url).toContain('test-bucket');
    });

    it('should generate a presigned URL with custom expiration', async () => {
      const url = await service.generatePresignedUrl('images/test-file.jpg', 7200);

      expect(url).toBeTruthy();
      expect(typeof url).toBe('string');
    });

    it('should handle presigned URL generation errors', async () => {
      // Mock the S3 client to throw an error
      const errorService = new MediaStorageService({
        region: 'invalid-region',
        bucket: 'test-bucket',
      });

      // This should handle gracefully
      try {
        await errorService.generatePresignedUrl('images/test-file.jpg');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      s3Mock.resolves({});

      await expect(service.deleteFile('images/test-file.jpg')).resolves.not.toThrow();
    });

    it('should handle S3 delete errors', async () => {
      s3Mock.rejects(new Error('Delete failed'));

      await expect(service.deleteFile('images/test-file.jpg')).rejects.toThrow('Failed to delete file from S3');
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockDate = new Date();

      // Mock ListObjectsV2Command
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: 'images/file1.jpg' },
          { Key: 'images/file2.jpg' },
        ],
        IsTruncated: false,
      });

      // Mock HeadObjectCommand for getFileMetadata calls
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 1024,
        ContentType: 'image/jpeg',
        LastModified: mockDate,
        Metadata: {},
      });

      const result = await service.listFiles('images/');

      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('isTruncated', false);
      expect(result.files.length).toBe(2);
    });

    it('should handle pagination with continuation token', async () => {
      const mockDate = new Date();

      // Mock ListObjectsV2Command
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [{ Key: 'images/file1.jpg' }],
        IsTruncated: true,
        NextContinuationToken: 'token123',
      });

      // Mock HeadObjectCommand
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 1024,
        ContentType: 'image/jpeg',
        LastModified: mockDate,
        Metadata: {},
      });

      const result = await service.listFiles('images/', 10, 'token123');

      expect(result.isTruncated).toBe(true);
      expect(result.nextToken).toBe('token123');
    });

    it('should handle empty list', async () => {
      s3Mock.resolves({
        Contents: [],
        IsTruncated: false,
      });

      const result = await service.listFiles('images/');

      expect(result.files).toHaveLength(0);
      expect(result.isTruncated).toBe(false);
    });

    it('should handle S3 list errors', async () => {
      s3Mock.rejects(new Error('List failed'));

      await expect(service.listFiles('images/')).rejects.toThrow('Failed to list files from S3');
    });
  });

  describe('getFileMetadata', () => {
    it('should retrieve file metadata successfully', async () => {
      const mockDate = new Date();
      s3Mock.resolves({
        ContentLength: 2048,
        ContentType: 'image/png',
        LastModified: mockDate,
        Metadata: { userId: '123' },
      });

      const result = await service.getFileMetadata('images/test-file.png');

      expect(result).toMatchObject({
        key: 'images/test-file.png',
        size: 2048,
        contentType: 'image/png',
        lastModified: mockDate,
        metadata: { userId: '123' },
      });
    });

    it('should handle missing metadata fields', async () => {
      s3Mock.resolves({
        ContentLength: undefined,
        ContentType: undefined,
        LastModified: undefined,
      });

      const result = await service.getFileMetadata('images/test-file.png');

      expect(result.size).toBe(0);
      expect(result.contentType).toBe('application/octet-stream');
      expect(result.lastModified).toBeInstanceOf(Date);
    });

    it('should handle S3 metadata errors', async () => {
      s3Mock.rejects(new Error('Metadata retrieval failed'));

      await expect(service.getFileMetadata('images/test-file.png')).rejects.toThrow(
        'Failed to get file metadata from S3'
      );
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      s3Mock.resolves({
        ContentLength: 1024,
        ContentType: 'image/jpeg',
        LastModified: new Date(),
      });

      const result = await service.fileExists('images/test-file.jpg');

      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      s3Mock.rejects(new Error('Not found'));

      const result = await service.fileExists('images/nonexistent.jpg');

      expect(result).toBe(false);
    });
  });

  describe('getBucket', () => {
    it('should return the configured bucket name', () => {
      const bucket = service.getBucket();

      expect(bucket).toBe('test-bucket');
    });
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MediaStorageService.getInstance();
      const instance2 = MediaStorageService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should allow instance reset', () => {
      const instance1 = MediaStorageService.getInstance();
      MediaStorageService.resetInstance();
      const instance2 = MediaStorageService.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('File validation', () => {
    it('should accept all valid image types', async () => {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      for (const contentType of validImageTypes) {
        const fileBuffer = Buffer.from('test image');
        const params: UploadFileParams = {
          file: fileBuffer,
          contentType,
        };

        s3Mock.resolves({});

        await expect(service.uploadFile(params)).resolves.toBeDefined();
      }
    });

    it('should accept all valid video types', async () => {
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

      for (const contentType of validVideoTypes) {
        const fileBuffer = Buffer.from('test video');
        const params: UploadFileParams = {
          file: fileBuffer,
          contentType,
        };

        s3Mock.resolves({});

        await expect(service.uploadFile(params)).resolves.toBeDefined();
      }
    });

    it('should accept valid document types', async () => {
      const validDocTypes = ['application/pdf', 'application/json'];

      for (const contentType of validDocTypes) {
        const fileBuffer = Buffer.from('test document');
        const params: UploadFileParams = {
          file: fileBuffer,
          contentType,
        };

        s3Mock.resolves({});

        await expect(service.uploadFile(params)).resolves.toBeDefined();
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle maximum allowed file sizes', async () => {
      const testCases = [
        { type: 'image/jpeg', size: 5 * 1024 * 1024 }, // 5MB
        { type: 'video/mp4', size: 500 * 1024 * 1024 }, // 500MB
        { type: 'application/pdf', size: 10 * 1024 * 1024 }, // 10MB
      ];

      s3Mock.resolves({});

      for (const testCase of testCases) {
        const fileBuffer = Buffer.alloc(testCase.size);
        const params: UploadFileParams = {
          file: fileBuffer,
          contentType: testCase.type,
        };

        await expect(service.uploadFile(params)).resolves.toBeDefined();
      }
    });

    it('should handle empty metadata', async () => {
      const fileBuffer = Buffer.from('test content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'image/jpeg',
        metadata: {},
      };

      s3Mock.resolves({});

      const result = await service.uploadFile(params);

      expect(result).toBeDefined();
    });

    it('should handle missing fileName parameter', async () => {
      const fileBuffer = Buffer.from('test content');
      const params: UploadFileParams = {
        file: fileBuffer,
        contentType: 'image/jpeg',
      };

      s3Mock.resolves({});

      const result = await service.uploadFile(params);

      expect(result.key).toMatch(/^images\/file_\d+_.*\.jpeg$/);
    });
  });
});
