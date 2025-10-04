# Content Import Tools & Automation

Production-ready scripts for efficiently uploading and managing 50+ educational articles for the MediMate Education Hub.

## Overview

This toolkit provides automation for the complete content workflow:

1. **Validation** - Pre-upload content validation
2. **Metadata Generation** - Auto-generate tags, read times, and more
3. **Translation Checking** - Verify 4-language completeness
4. **Media Upload** - Batch upload to S3 with CDN URLs
5. **Bulk Import** - Upload articles to CMS with progress tracking

## Prerequisites

### Required Software

```bash
# Node.js 18+ required
node --version

# Install dependencies
npm install axios aws-sdk
```

### Environment Setup

Create a `.env` file with the following variables:

```bash
# API Configuration
API_URL=http://localhost:3000
API_TOKEN=your-admin-token-here

# S3 Configuration (MinIO or AWS)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_CONTENT=medimate-content
AWS_REGION=ap-southeast-1

# Optional: CDN URL for production
CDN_URL=https://cdn.medimate.com
```

### Authentication

For bulk import, you need an admin API token:

1. Log in to the admin panel
2. Navigate to Settings > API Tokens
3. Generate a new token with `admin` role
4. Add to `.env` as `API_TOKEN`

## Content Format

Content files should be JSON with this structure:

```json
{
  "type": "article",
  "category": "chronic_disease",
  "title": {
    "ms": "Pengurusan Diabetes",
    "en": "Diabetes Management",
    "zh": "糖尿病管理",
    "ta": "நீரிழிவு நோய் மேலாண்மை"
  },
  "description": {
    "ms": "Panduan komprehensif...",
    "en": "Comprehensive guide to managing type 2 diabetes...",
    "zh": "管理2型糖尿病的综合指南...",
    "ta": "வகை 2 நீரிழிவு நோயை நிர்வகிப்பதற்கான விரிவான வழிகாட்டி..."
  },
  "body": {
    "ms": "Full article content in Malay...",
    "en": "Full article content in English...",
    "zh": "Full article content in Chinese...",
    "ta": "Full article content in Tamil..."
  },
  "metadata": {
    "estimatedReadTime": 5,
    "difficulty": "beginner",
    "tags": ["diabetes", "chronic disease", "health"],
    "relatedConditions": ["E11"],
    "relatedMedications": [],
    "author": "Dr. Sarah Chen, MD",
    "reviewedBy": "Dr. Ahmad Ibrahim, MBBS"
  }
}
```

## Script Usage

### 1. Validate Content

Check that content files meet all requirements before upload.

```bash
# Validate single file
node scripts/content/validate_content.js content/articles/diabetes.json

# Validate entire directory
node scripts/content/validate_content.js content/articles/

# Get help
node scripts/content/validate_content.js --help
```

**Validation Checks:**
- Required fields present (type, category, title, description, body)
- Multi-language support (EN required, MS/ZH/TA recommended)
- Word count (300-2000 for articles)
- Description length (100-250 characters)
- Reading level (target: grade 8 or below)
- Metadata completeness
- Tag count (minimum 2 recommended)

**Exit Codes:**
- `0` - All files passed
- `1` - One or more files failed validation

### 2. Check Translations

Verify that all content has complete translations in all 4 languages.

```bash
# Detailed report with file-by-file breakdown
node scripts/content/check_translations.js content/articles/

# Summary report only
node scripts/content/check_translations.js --report summary content/

# Generate CSV export
node scripts/content/check_translations.js --report csv content/ > translations.csv

# Get help
node scripts/content/check_translations.js --help
```

**Checks:**
- All 4 languages present (MS, EN, ZH, TA)
- No empty translations
- No placeholder text
- Translation length balance (within 30% variance)

**Exit Codes:**
- `0` - All content fully translated
- `1` - Some translations missing or incomplete

### 3. Generate Metadata

Auto-generate or update metadata fields.

```bash
# Preview changes without modifying files
node scripts/content/generate_metadata.js --dry-run content/articles/

# Generate and update files
node scripts/content/generate_metadata.js content/articles/

# Process single file
node scripts/content/generate_metadata.js content/articles/diabetes.json

# Get help
node scripts/content/generate_metadata.js --help
```

**Auto-Generated Fields:**
- `estimatedReadTime` - Based on word count (200 words/min)
- `tags` - Keywords extracted from content
- `difficulty` - Suggested based on length and complexity
- `relatedConditions` - ICD-10 codes detected in text
- `relatedMedications` - Medication names found in content

**Note:** Review suggestions before committing changes. The script will suggest updates even if metadata already exists.

### 4. Upload Media Files

Batch upload images, videos, and subtitles to S3.

```bash
# Preview upload without actually uploading
node scripts/content/media_upload.js --dry-run media/

# Upload to default bucket
node scripts/content/media_upload.js media/images/

# Upload to specific bucket with custom endpoint
node scripts/content/media_upload.js \
  --bucket medimate-content \
  --endpoint http://localhost:9000 \
  media/

# Upload with CDN URL
node scripts/content/media_upload.js \
  --cdn https://cdn.medimate.com \
  --manifest media-urls.json \
  media/

# Get help
node scripts/content/media_upload.js --help
```

**Supported File Types:**
- **Images:** .jpg, .jpeg, .png, .gif, .webp, .svg
- **Videos:** .mp4, .webm, .mov
- **Subtitles:** .vtt, .srt
- **Documents:** .pdf

**Output:**
- Console progress for each file
- `upload-manifest.json` with all uploaded file URLs
- Use manifest URLs in content `mediaUrls` field

**S3 Key Structure:**
```
uploads/{relative-path}/{year}/{month}/{filename}_{hash}.{ext}
```

Example: `uploads/articles/2025/10/diabetes-infographic_a3f8b2c1.png`

### 5. Bulk Import to CMS

Upload multiple content files to the CMS in batch.

```bash
# Test connection and preview import
node scripts/content/bulk_import.js --dry-run content/articles/

# Import with default settings
node scripts/content/bulk_import.js content/articles/

# Import with custom batch size and delay
node scripts/content/bulk_import.js \
  --batch-size 10 \
  --delay 2000 \
  content/articles/

# Import to specific API
node scripts/content/bulk_import.js \
  --api http://api.medimate.com \
  --token your-token \
  content/

# Get help
node scripts/content/bulk_import.js --help
```

**Options:**
- `--api <url>` - API base URL (default: http://localhost:3000)
- `--token <token>` - Admin authentication token
- `--batch-size <n>` - Concurrent uploads (default: 5)
- `--delay <ms>` - Delay between batches (default: 1000ms)
- `--report <path>` - Save import report (default: import-report.json)
- `--dry-run` - Validate without importing

**Process:**
1. Scans directory for JSON files
2. Validates each file
3. Transforms to API format
4. Uploads in batches with progress tracking
5. Generates import report with success/failure details

**Exit Codes:**
- `0` - All files imported successfully
- `1` - One or more imports failed (see report)

## Complete Workflow Example

Here's the recommended workflow for importing 50+ articles:

```bash
# Step 1: Organize your content
mkdir -p content/articles
mkdir -p content/media

# Step 2: Validate all content
node scripts/content/validate_content.js content/articles/
# Fix any validation errors before proceeding

# Step 3: Check translations
node scripts/content/check_translations.js content/articles/
# Ensure all 4 languages are complete

# Step 4: Generate metadata
node scripts/content/generate_metadata.js --dry-run content/articles/
# Review suggestions
node scripts/content/generate_metadata.js content/articles/

# Step 5: Upload media files first
node scripts/content/media_upload.js \
  --manifest media-manifest.json \
  content/media/

# Step 6: Update content files with media URLs
# (Manually add URLs from media-manifest.json to content files)

# Step 7: Final validation
node scripts/content/validate_content.js content/articles/

# Step 8: Bulk import to CMS
node scripts/content/bulk_import.js \
  --report import-report-$(date +%Y%m%d).json \
  content/articles/

# Step 9: Review import report
cat import-report-*.json | jq '.summary'
```

## Troubleshooting

### Validation Errors

**"JSON parse error"**
- Check file encoding (must be UTF-8)
- Validate JSON syntax using `jq` or online validator

**"Reading level too high"**
- Simplify language, use shorter sentences
- Target: 8th grade reading level for elderly audience

**"Translation length variance"**
- Translations should be similar in length (±30%)
- Very short/long translations may indicate incomplete translation

### Upload Failures

**"API connection failed"**
- Ensure backend server is running: `npm run dev`
- Check API_URL in `.env`

**"Authentication required"**
- Generate admin token from admin panel
- Add to `.env` as `API_TOKEN`

**"S3 upload failed"**
- Check S3 credentials in `.env`
- Ensure MinIO/S3 service is running
- Verify bucket exists and has correct permissions

**"Bucket does not exist"**
- Script will auto-create bucket
- If using AWS S3, ensure credentials have `s3:CreateBucket` permission

### Rate Limiting

If you encounter rate limiting errors:

```bash
# Reduce batch size
node scripts/content/bulk_import.js --batch-size 3 content/

# Increase delay between batches
node scripts/content/bulk_import.js --delay 2000 content/
```

## Testing

Each script includes dry-run mode for testing:

```bash
# Test validation
node scripts/content/validate_content.js content/articles/

# Test translation check
node scripts/content/check_translations.js --report summary content/

# Test metadata generation
node scripts/content/generate_metadata.js --dry-run content/

# Test media upload
node scripts/content/media_upload.js --dry-run media/

# Test bulk import
node scripts/content/bulk_import.js --dry-run content/
```

## Best Practices

### Content Organization

```
content/
├── articles/
│   ├── chronic_diseases/
│   │   ├── diabetes_management.json
│   │   ├── hypertension_control.json
│   │   └── ...
│   ├── medications/
│   │   ├── metformin_guide.json
│   │   ├── amlodipine_guide.json
│   │   └── ...
│   └── general_health/
│       ├── medication_adherence.json
│       └── ...
└── media/
    ├── images/
    ├── videos/
    └── subtitles/
```

### Version Control

- Commit content files to Git
- Track media files separately (use Git LFS or external storage)
- Save import reports for audit trail

### Batch Processing

- Process 50-100 files at a time
- Use `--batch-size 5-10` for optimal performance
- Monitor API server load during bulk imports

### Error Recovery

- Import reports include failed files
- Re-run script on failed files only
- Use version control to rollback if needed

## Script Dependencies

All scripts are standalone Node.js files with minimal dependencies:

- `validate_content.js` - No external dependencies
- `check_translations.js` - No external dependencies
- `generate_metadata.js` - Requires `medical_terms.json` (included)
- `media_upload.js` - Requires `aws-sdk`
- `bulk_import.js` - Requires `axios`, uses `validate_content.js`

Install dependencies:
```bash
npm install axios aws-sdk
```

## Performance

**Expected Processing Times:**

| Operation | Files | Time |
|-----------|-------|------|
| Validation | 50 | ~5 seconds |
| Translation Check | 50 | ~3 seconds |
| Metadata Generation | 50 | ~10 seconds |
| Media Upload | 100 files (500 MB) | ~2-5 minutes |
| Bulk Import | 50 articles | ~5-10 minutes |

**Optimization Tips:**
- Use SSD storage for faster file I/O
- Increase `--batch-size` if server can handle load
- Use CDN for faster media delivery
- Run scripts in parallel (validation + translation check)

## Support

For issues or questions:

1. Check script help: `node <script>.js --help`
2. Review error messages and logs
3. Consult this README
4. Check API server logs for backend errors
5. Contact development team

## License

Copyright 2025 MediMate Malaysia. Internal use only.
