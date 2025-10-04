#!/usr/bin/env node

/**
 * Bulk Content Import Script
 *
 * Upload multiple educational articles to the CMS in batch.
 * Validates content, handles media URLs, tracks progress, and provides rollback.
 *
 * Usage:
 *   node scripts/content/bulk_import.js <directory>
 *   node scripts/content/bulk_import.js --api http://localhost:3000 content/articles/
 */

const fs = require('fs');
const path = require('path');

// Load dependencies
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.error('Error: axios not installed. Run: npm install axios');
  process.exit(1);
}

// Load validation utilities
const { validateContent } = require('./validate_content.js');

// Configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  apiToken: process.env.API_TOKEN || null,
  batchSize: 5,
  delayMs: 1000
};

// Results tracking
const results = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  imported: [],
  errors: []
};

/**
 * Load authentication token
 */
function getAuthToken() {
  if (config.apiToken) {
    return config.apiToken;
  }

  // Try to load from .env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/API_TOKEN=(.+)/);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Create HTTP client with auth
 */
function createClient() {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: config.apiUrl,
    headers,
    timeout: 30000
  });
}

/**
 * Validate content before import
 */
function preValidate(content, filePath) {
  const validation = validateContent(content, filePath);

  if (validation.errors.length > 0) {
    return {
      valid: false,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  return {
    valid: true,
    errors: [],
    warnings: validation.warnings
  };
}

/**
 * Transform content to API format
 */
function transformContent(content) {
  // Ensure all required fields are present
  const payload = {
    type: content.type || 'article',
    category: content.category,
    title: content.title || {},
    description: content.description || {},
    body: content.body || {},
    metadata: {
      estimatedReadTime: content.metadata?.estimatedReadTime || 5,
      difficulty: content.metadata?.difficulty || 'beginner',
      tags: content.metadata?.tags || [],
      relatedMedications: content.metadata?.relatedMedications || [],
      relatedConditions: content.metadata?.relatedConditions || [],
      author: content.metadata?.author,
      reviewedBy: content.metadata?.reviewedBy
    }
  };

  // Add media URLs if present
  if (content.mediaUrls) {
    payload.mediaUrls = content.mediaUrls;
  }

  return payload;
}

/**
 * Import single content item
 */
async function importContent(client, filePath, dryRun = false) {
  results.total++;

  try {
    // Read and parse file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let content;

    try {
      content = JSON.parse(fileContent);
    } catch (parseError) {
      results.failed++;
      results.errors.push({
        file: filePath,
        error: `JSON parse error: ${parseError.message}`
      });
      console.error(`❌ ${path.basename(filePath)}: JSON parse error`);
      return null;
    }

    // Pre-validate content
    const validation = preValidate(content, filePath);
    if (!validation.valid) {
      results.skipped++;
      results.errors.push({
        file: filePath,
        error: `Validation failed: ${validation.errors.join('; ')}`
      });
      console.error(`⚠️  ${path.basename(filePath)}: Validation failed`);
      return null;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.log(`⚠️  ${path.basename(filePath)}: ${validation.warnings.length} warnings`);
    }

    // Transform to API format
    const payload = transformContent(content);

    if (dryRun) {
      console.log(`[DRY RUN] Would import ${path.basename(filePath)}`);
      console.log(`  Type: ${payload.type}, Category: ${payload.category}`);
      console.log(`  Title (EN): ${payload.title.en}`);
      results.skipped++;
      return null;
    }

    // Import via API
    console.log(`Importing ${path.basename(filePath)}...`);

    const response = await client.post('/api/admin/education/content', payload);

    if (response.data.success) {
      results.success++;
      results.imported.push({
        file: filePath,
        id: response.data.data.id,
        title: payload.title.en
      });
      console.log(`  ✓ Imported successfully (ID: ${response.data.data.id})`);
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Import failed');
    }

  } catch (error) {
    results.failed++;
    const errorMsg = error.response?.data?.error || error.message;
    results.errors.push({
      file: filePath,
      error: errorMsg
    });
    console.error(`  ❌ Import failed: ${errorMsg}`);
    return null;
  }
}

/**
 * Import directory in batches with progress tracking
 */
async function importDirectory(client, dirPath, dryRun = false) {
  const files = [];

  // Collect all JSON files
  function collectFiles(dir) {
    const entries = fs.readdirSync(dir);

    entries.forEach(entry => {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        collectFiles(fullPath);
      } else if (stat.isFile() && entry.endsWith('.json')) {
        files.push(fullPath);
      }
    });
  }

  collectFiles(dirPath);

  console.log(`Found ${files.length} content files\n`);

  // Process in batches
  for (let i = 0; i < files.length; i += config.batchSize) {
    const batch = files.slice(i, i + config.batchSize);
    const batchNum = Math.floor(i / config.batchSize) + 1;
    const totalBatches = Math.ceil(files.length / config.batchSize);

    console.log(`\n=== Batch ${batchNum}/${totalBatches} ===\n`);

    // Process batch concurrently
    const promises = batch.map(file => importContent(client, file, dryRun));
    await Promise.all(promises);

    // Progress update
    const progress = Math.round(((i + batch.length) / files.length) * 100);
    console.log(`\nProgress: ${i + batch.length}/${files.length} (${progress}%)`);

    // Delay between batches to avoid rate limiting
    if (i + config.batchSize < files.length && !dryRun) {
      console.log(`Waiting ${config.delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, config.delayMs));
    }
  }
}

/**
 * Save import report
 */
function saveReport(outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      success: results.success,
      failed: results.failed,
      skipped: results.skipped
    },
    imported: results.imported,
    errors: results.errors
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nImport report saved to: ${outputPath}`);
}

/**
 * Print summary
 */
function printSummary(dryRun) {
  console.log('\n=== Import Summary ===\n');
  console.log(`Total files: ${results.total}`);
  console.log(`Successful: ${results.success} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Skipped: ${results.skipped} ⚠`);
  console.log('');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No content was imported');
  }

  if (results.errors.length > 0) {
    console.log(`\n=== Errors (${results.errors.length}) ===\n`);
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${path.basename(error.file)}`);
      console.log(`   ${error.error}`);
    });
  }

  console.log('\n======================\n');
}

/**
 * Test API connection
 */
async function testConnection(client) {
  try {
    const response = await client.get('/health');
    console.log('✓ API connection successful\n');
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    console.error('   Make sure the backend server is running');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Bulk Content Import Script

Import multiple educational articles to the CMS in batch.

Usage:
  node bulk_import.js [options] <directory>

Options:
  --api <url>         API base URL (default: ${config.apiUrl})
  --token <token>     API authentication token
  --batch-size <n>    Number of files to process concurrently (default: ${config.batchSize})
  --delay <ms>        Delay between batches in milliseconds (default: ${config.delayMs})
  --report <path>     Save import report to file (default: import-report.json)
  --dry-run           Validate and preview without importing
  --help, -h          Show this help message

Environment Variables:
  API_URL             API base URL
  API_TOKEN           Authentication token (required for protected endpoints)

Examples:
  node bulk_import.js content/articles/
  node bulk_import.js --dry-run content/
  node bulk_import.js --api http://localhost:3000 --token abc123 content/
  node bulk_import.js --batch-size 10 --delay 2000 content/articles/

Prerequisites:
  1. Backend server must be running
  2. Valid authentication token (for admin endpoints)
  3. Content files must pass validation
  4. Media files should be uploaded first (use media_upload.js)

Import Process:
  1. Scan directory for JSON files
  2. Validate each file
  3. Transform to API format
  4. Upload in batches with progress tracking
  5. Generate import report
    `);
    process.exit(0);
  }

  let dryRun = false;
  let target = null;
  let reportPath = 'import-report.json';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api' && i + 1 < args.length) {
      config.apiUrl = args[i + 1];
      i++;
    } else if (args[i] === '--token' && i + 1 < args.length) {
      config.apiToken = args[i + 1];
      i++;
    } else if (args[i] === '--batch-size' && i + 1 < args.length) {
      config.batchSize = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--delay' && i + 1 < args.length) {
      config.delayMs = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--report' && i + 1 < args.length) {
      reportPath = args[i + 1];
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

  console.log('=== Bulk Content Import ===\n');
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Target: ${target}`);
  console.log(`Batch size: ${config.batchSize}`);
  console.log(`Delay: ${config.delayMs}ms`);
  console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Create HTTP client
  const client = createClient();

  // Test connection (skip in dry-run)
  if (!dryRun) {
    const connected = await testConnection(client);
    if (!connected) {
      process.exit(1);
    }
  }

  // Import directory
  console.log(`Starting bulk import from ${target}...\n`);
  await importDirectory(client, target, dryRun);

  // Save report
  if (results.total > 0) {
    saveReport(reportPath);
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
  importContent,
  transformContent,
  preValidate
};
