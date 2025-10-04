#!/usr/bin/env node

/**
 * Media Upload Script
 *
 * Batch upload images, videos, and other media files to AWS S3 (or MinIO).
 * Generates CDN URLs and creates a manifest file for use in content import.
 *
 * Usage:
 *   node scripts/content/media_upload.js <directory>
 *   node scripts/content/media_upload.js --bucket medimate-content media/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load AWS SDK (requires: npm install aws-sdk)
let AWS;
try {
  AWS = require('aws-sdk');
} catch (error) {
  console.error('Error: aws-sdk not installed. Run: npm install aws-sdk');
  process.exit(1);
}

// Configuration from environment
const config = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  bucket: process.env.S3_BUCKET_CONTENT || 'medimate-content',
  region: process.env.AWS_REGION || 'ap-southeast-1',
  cdnUrl: process.env.CDN_URL || null
};

// Results tracking
const results = {
  total: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
  manifest: []
};

/**
 * Initialize S3 client
 */
function initS3() {
  const s3Config = {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
  };

  if (config.endpoint) {
    s3Config.endpoint = config.endpoint;
  }

  return new AWS.S3(s3Config);
}

/**
 * Generate unique file key with hash to prevent collisions
 */
function generateFileKey(filePath, basePath = '') {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const relativePath = path.relative(basePath, path.dirname(filePath));

  // Generate short hash from file path
  const hash = crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8);

  // Create S3 key: uploads/{year}/{month}/{name}_{hash}{ext}
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  let prefix = 'uploads';
  if (relativePath && relativePath !== '.') {
    prefix = `uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  return `${prefix}/${year}/${month}/${basename}_${hash}${ext}`;
}

/**
 * Determine content type from file extension
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',

    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',

    // Subtitles
    '.vtt': 'text/vtt',
    '.srt': 'application/x-subrip',

    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file should be uploaded
 */
function shouldUpload(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const validExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.mp4', '.webm', '.mov',
    '.vtt', '.srt',
    '.pdf'
  ];

  return validExtensions.includes(ext);
}

/**
 * Upload single file to S3
 */
async function uploadFile(s3, filePath, basePath, dryRun = false) {
  results.total++;

  try {
    if (!shouldUpload(filePath)) {
      results.skipped++;
      return null;
    }

    const fileKey = generateFileKey(filePath, basePath);
    const contentType = getContentType(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

    console.log(`Uploading ${path.basename(filePath)} (${fileSizeMB} MB)...`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would upload to: ${fileKey}`);
      results.skipped++;
      return {
        localPath: filePath,
        s3Key: fileKey,
        url: generateUrl(fileKey),
        contentType,
        size: fileBuffer.length
      };
    }

    // Upload to S3
    const uploadParams = {
      Bucket: config.bucket,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000', // 1 year cache
      Metadata: {
        'original-name': path.basename(filePath),
        'uploaded-at': new Date().toISOString()
      }
    };

    await s3.upload(uploadParams).promise();

    results.uploaded++;

    const url = generateUrl(fileKey);
    console.log(`  ✓ Uploaded to: ${url}`);

    return {
      localPath: filePath,
      s3Key: fileKey,
      url,
      contentType,
      size: fileBuffer.length
    };

  } catch (error) {
    results.failed++;
    console.error(`  ❌ Failed to upload ${path.basename(filePath)}: ${error.message}`);
    return null;
  }
}

/**
 * Generate public URL for uploaded file
 */
function generateUrl(s3Key) {
  if (config.cdnUrl) {
    return `${config.cdnUrl}/${s3Key}`;
  }

  // Use S3 endpoint URL
  if (config.endpoint) {
    const endpoint = config.endpoint.replace(/\/$/, '');
    return `${endpoint}/${config.bucket}/${s3Key}`;
  }

  // AWS S3 URL format
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${s3Key}`;
}

/**
 * Upload directory recursively
 */
async function uploadDirectory(s3, dirPath, basePath, dryRun = false) {
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await uploadDirectory(s3, fullPath, basePath, dryRun);
    } else if (stat.isFile()) {
      const result = await uploadFile(s3, fullPath, basePath, dryRun);
      if (result) {
        results.manifest.push(result);
      }
    }
  }
}

/**
 * Save manifest file
 */
function saveManifest(outputPath) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    bucket: config.bucket,
    cdnUrl: config.cdnUrl,
    totalFiles: results.manifest.length,
    files: results.manifest
  };

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nManifest saved to: ${outputPath}`);
}

/**
 * Print summary
 */
function printSummary(dryRun) {
  console.log('\n=== Upload Summary ===\n');
  console.log(`Total files: ${results.total}`);
  console.log(`Uploaded: ${dryRun ? 0 : results.uploaded}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log('');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No files were uploaded');
  }

  console.log('======================\n');
}

/**
 * Ensure bucket exists
 */
async function ensureBucket(s3) {
  try {
    await s3.headBucket({ Bucket: config.bucket }).promise();
    console.log(`✓ Bucket '${config.bucket}' exists\n`);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`Creating bucket '${config.bucket}'...`);
      try {
        await s3.createBucket({ Bucket: config.bucket }).promise();
        console.log(`✓ Bucket created\n`);
      } catch (createError) {
        console.error(`Failed to create bucket: ${createError.message}`);
        process.exit(1);
      }
    } else {
      console.error(`Failed to check bucket: ${error.message}`);
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Media Upload Script

Upload images, videos, and media files to AWS S3 or MinIO.

Usage:
  node media_upload.js [options] <directory>

Options:
  --bucket <name>     S3 bucket name (default: ${config.bucket})
  --endpoint <url>    S3 endpoint URL (default: ${config.endpoint})
  --cdn <url>         CDN base URL for file URLs
  --manifest <path>   Save upload manifest to file (default: upload-manifest.json)
  --dry-run           Preview upload without actually uploading
  --help, -h          Show this help message

Environment Variables:
  S3_ENDPOINT         S3-compatible endpoint URL
  S3_ACCESS_KEY       S3 access key ID
  S3_SECRET_KEY       S3 secret access key
  S3_BUCKET_CONTENT   Default bucket name
  AWS_REGION          AWS region (default: ap-southeast-1)
  CDN_URL             CDN base URL

Examples:
  node media_upload.js media/images/
  node media_upload.js --dry-run media/
  node media_upload.js --bucket content --cdn https://cdn.example.com media/
  node media_upload.js --manifest uploads.json media/videos/

Supported File Types:
  Images: .jpg, .jpeg, .png, .gif, .webp, .svg
  Videos: .mp4, .webm, .mov
  Subtitles: .vtt, .srt
  Documents: .pdf
    `);
    process.exit(0);
  }

  let dryRun = false;
  let target = null;
  let manifestPath = 'upload-manifest.json';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bucket' && i + 1 < args.length) {
      config.bucket = args[i + 1];
      i++;
    } else if (args[i] === '--endpoint' && i + 1 < args.length) {
      config.endpoint = args[i + 1];
      i++;
    } else if (args[i] === '--cdn' && i + 1 < args.length) {
      config.cdnUrl = args[i + 1];
      i++;
    } else if (args[i] === '--manifest' && i + 1 < args.length) {
      manifestPath = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (!args[i].startsWith('--')) {
      target = args[i];
    }
  }

  if (!target) {
    console.error('Error: No target directory specified');
    process.exit(1);
  }

  if (!fs.existsSync(target)) {
    console.error(`Error: Directory does not exist: ${target}`);
    process.exit(1);
  }

  const stat = fs.statSync(target);
  if (!stat.isDirectory()) {
    console.error(`Error: Target must be a directory: ${target}`);
    process.exit(1);
  }

  console.log('=== Media Upload Configuration ===\n');
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Bucket: ${config.bucket}`);
  console.log(`Region: ${config.region}`);
  console.log(`CDN URL: ${config.cdnUrl || 'Not configured'}`);
  console.log(`Target: ${target}`);
  console.log(`Dry Run: ${dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Initialize S3
  const s3 = initS3();

  // Ensure bucket exists (skip in dry-run)
  if (!dryRun) {
    await ensureBucket(s3);
  }

  // Upload directory
  console.log(`Uploading files from ${target}...\n`);
  await uploadDirectory(s3, target, target, dryRun);

  // Save manifest
  if (results.manifest.length > 0) {
    saveManifest(manifestPath);
  }

  // Print summary
  printSummary(dryRun);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  uploadFile,
  generateFileKey,
  getContentType,
  generateUrl
};
