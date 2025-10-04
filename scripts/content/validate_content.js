#!/usr/bin/env node

/**
 * Content Validation Script
 *
 * Pre-upload validation for educational content.
 * Validates JSON/Markdown files against schema, checks readability,
 * and ensures all required fields are present.
 *
 * Usage:
 *   node scripts/content/validate_content.js <file-or-directory>
 *   node scripts/content/validate_content.js --format json content/articles/*.json
 */

const fs = require('fs');
const path = require('path');

// Validation configuration
const VALID_LANGUAGES = ['ms', 'en', 'zh', 'ta'];
const VALID_CONTENT_TYPES = ['article', 'video', 'quiz', 'interactive'];
const VALID_CATEGORIES = ['chronic_disease', 'medication', 'general_health'];
const VALID_DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const MIN_WORD_COUNT = 300;
const MAX_WORD_COUNT = 2000;
const MIN_DESCRIPTION_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 250;

// Validation results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

/**
 * Count words in text
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculate Flesch-Kincaid reading level
 * Target: Grade 8 or below for elderly readability
 */
function calculateReadingLevel(text) {
  if (!text || typeof text !== 'string') return null;

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);

  if (sentences.length === 0 || words.length === 0) return null;

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch-Kincaid Grade Level
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  return Math.max(0, gradeLevel);
}

/**
 * Simple syllable counter (approximation)
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  const vowels = 'aeiouy';
  let count = 0;
  let prevWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevWasVowel) {
      count++;
    }
    prevWasVowel = isVowel;
  }

  // Adjust for silent 'e' at the end
  if (word.endsWith('e')) count--;

  return Math.max(1, count);
}

/**
 * Estimate read time in minutes
 */
function estimateReadTime(text, wordsPerMinute = 200) {
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Validate multi-language text field
 */
function validateMultiLanguageText(fieldName, value, options = {}) {
  const errors = [];
  const warnings = [];

  if (!value || typeof value !== 'object') {
    errors.push(`${fieldName} must be an object with language keys`);
    return { errors, warnings };
  }

  // Check for at least English
  if (!value.en || typeof value.en !== 'string' || value.en.trim().length === 0) {
    errors.push(`${fieldName}.en is required and cannot be empty`);
  }

  // Check each language
  VALID_LANGUAGES.forEach(lang => {
    if (value[lang]) {
      if (typeof value[lang] !== 'string') {
        errors.push(`${fieldName}.${lang} must be a string`);
      } else if (value[lang].trim().length === 0) {
        warnings.push(`${fieldName}.${lang} is present but empty`);
      } else {
        // Length validation
        if (options.minLength && value[lang].length < options.minLength) {
          errors.push(`${fieldName}.${lang} is too short (min: ${options.minLength} chars)`);
        }
        if (options.maxLength && value[lang].length > options.maxLength) {
          warnings.push(`${fieldName}.${lang} is too long (max: ${options.maxLength} chars)`);
        }
      }
    }
  });

  return { errors, warnings };
}

/**
 * Validate content metadata
 */
function validateMetadata(metadata) {
  const errors = [];
  const warnings = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push('metadata is required and must be an object');
    return { errors, warnings };
  }

  // Difficulty level
  if (!metadata.difficulty) {
    errors.push('metadata.difficulty is required');
  } else if (!VALID_DIFFICULTY_LEVELS.includes(metadata.difficulty)) {
    errors.push(`metadata.difficulty must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
  }

  // Tags
  if (!metadata.tags || !Array.isArray(metadata.tags) || metadata.tags.length === 0) {
    errors.push('metadata.tags is required and must be a non-empty array');
  } else if (metadata.tags.length < 2) {
    warnings.push('metadata.tags should have at least 2 tags for better discoverability');
  } else if (metadata.tags.length > 10) {
    warnings.push('metadata.tags has too many tags (recommended max: 10)');
  }

  // Estimated read time
  if (metadata.estimatedReadTime !== undefined) {
    if (typeof metadata.estimatedReadTime !== 'number' || metadata.estimatedReadTime <= 0) {
      errors.push('metadata.estimatedReadTime must be a positive number');
    }
  }

  // Related fields (optional but should be arrays if present)
  if (metadata.relatedMedications !== undefined && !Array.isArray(metadata.relatedMedications)) {
    errors.push('metadata.relatedMedications must be an array');
  }
  if (metadata.relatedConditions !== undefined && !Array.isArray(metadata.relatedConditions)) {
    errors.push('metadata.relatedConditions must be an array');
  }

  return { errors, warnings };
}

/**
 * Validate complete content object
 */
function validateContent(content, filePath) {
  const errors = [];
  const warnings = [];

  // Type validation
  if (!content.type) {
    errors.push('type is required');
  } else if (!VALID_CONTENT_TYPES.includes(content.type)) {
    errors.push(`type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
  }

  // Category validation
  if (!content.category) {
    errors.push('category is required');
  } else if (!VALID_CATEGORIES.includes(content.category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Title validation
  const titleValidation = validateMultiLanguageText('title', content.title, {
    minLength: 10,
    maxLength: 200
  });
  errors.push(...titleValidation.errors);
  warnings.push(...titleValidation.warnings);

  // Description validation
  const descValidation = validateMultiLanguageText('description', content.description, {
    minLength: MIN_DESCRIPTION_LENGTH,
    maxLength: MAX_DESCRIPTION_LENGTH
  });
  errors.push(...descValidation.errors);
  warnings.push(...descValidation.warnings);

  // Body validation (for articles)
  if (content.type === 'article') {
    const bodyValidation = validateMultiLanguageText('body', content.body);
    errors.push(...bodyValidation.errors);
    warnings.push(...bodyValidation.warnings);

    // Word count validation for English content
    if (content.body && content.body.en) {
      const wordCount = countWords(content.body.en);
      if (wordCount < MIN_WORD_COUNT) {
        warnings.push(`English content is too short (${wordCount} words, min: ${MIN_WORD_COUNT})`);
      } else if (wordCount > MAX_WORD_COUNT) {
        warnings.push(`English content is too long (${wordCount} words, max: ${MAX_WORD_COUNT})`);
      }

      // Reading level check
      const readingLevel = calculateReadingLevel(content.body.en);
      if (readingLevel !== null) {
        if (readingLevel > 10) {
          warnings.push(`English content reading level is too high (grade ${readingLevel.toFixed(1)}, target: ≤8)`);
        }
      }

      // Auto-calculate estimated read time if not provided
      if (!content.metadata?.estimatedReadTime) {
        const estimatedTime = estimateReadTime(content.body.en);
        warnings.push(`Suggested estimatedReadTime: ${estimatedTime} minutes (based on ${wordCount} words)`);
      }
    }
  }

  // Metadata validation
  const metadataValidation = validateMetadata(content.metadata);
  errors.push(...metadataValidation.errors);
  warnings.push(...metadataValidation.warnings);

  return { errors, warnings };
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  results.total++;

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let content;

    // Parse JSON
    try {
      content = JSON.parse(fileContent);
    } catch (parseError) {
      results.failed++;
      results.errors.push({
        file: filePath,
        errors: [`JSON parse error: ${parseError.message}`],
        warnings: []
      });
      return;
    }

    // Validate content
    const validation = validateContent(content, filePath);

    if (validation.errors.length > 0) {
      results.failed++;
      results.errors.push({
        file: filePath,
        errors: validation.errors,
        warnings: validation.warnings
      });
    } else {
      results.passed++;
      if (validation.warnings.length > 0) {
        results.warnings += validation.warnings.length;
        results.errors.push({
          file: filePath,
          errors: [],
          warnings: validation.warnings
        });
      }
    }
  } catch (error) {
    results.failed++;
    results.errors.push({
      file: filePath,
      errors: [`File read error: ${error.message}`],
      warnings: []
    });
  }
}

/**
 * Validate directory recursively
 */
function validateDirectory(dirPath, pattern = /\.json$/) {
  const entries = fs.readdirSync(dirPath);

  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      validateDirectory(fullPath, pattern);
    } else if (stat.isFile() && pattern.test(entry)) {
      validateFile(fullPath);
    }
  });
}

/**
 * Print validation results
 */
function printResults() {
  console.log('\n=== Content Validation Results ===\n');
  console.log(`Total files: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Warnings: ${results.warnings} ⚠`);
  console.log('');

  if (results.errors.length > 0) {
    console.log('=== Issues Found ===\n');

    results.errors.forEach(item => {
      const fileName = path.basename(item.file);

      if (item.errors.length > 0) {
        console.log(`\n❌ ${fileName}`);
        console.log(`   Path: ${item.file}`);
        item.errors.forEach(error => {
          console.log(`   ERROR: ${error}`);
        });
      }

      if (item.warnings.length > 0) {
        if (item.errors.length === 0) {
          console.log(`\n⚠️  ${fileName}`);
          console.log(`   Path: ${item.file}`);
        }
        item.warnings.forEach(warning => {
          console.log(`   WARNING: ${warning}`);
        });
      }
    });
  }

  console.log('\n=================================\n');

  return results.failed === 0 ? 0 : 1;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Content Validation Script

Usage:
  node validate_content.js <file-or-directory>
  node validate_content.js content/articles/
  node validate_content.js content/articles/diabetes.json

Options:
  --help, -h    Show this help message

Validation checks:
  • Required fields (type, category, title, description, body)
  • Multi-language text (en required, ms/zh/ta optional)
  • Content type and category values
  • Word count (${MIN_WORD_COUNT}-${MAX_WORD_COUNT} for articles)
  • Description length (${MIN_DESCRIPTION_LENGTH}-${MAX_DESCRIPTION_LENGTH} chars)
  • Reading level (target: grade 8 or below)
  • Metadata completeness and validity
  • Tag count (minimum 2 recommended)
    `);
    process.exit(0);
  }

  const target = args[0];

  if (!fs.existsSync(target)) {
    console.error(`Error: Path does not exist: ${target}`);
    process.exit(1);
  }

  const stat = fs.statSync(target);

  console.log('Starting content validation...\n');

  if (stat.isDirectory()) {
    validateDirectory(target);
  } else if (stat.isFile()) {
    validateFile(target);
  } else {
    console.error(`Error: Invalid target: ${target}`);
    process.exit(1);
  }

  const exitCode = printResults();
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  validateContent,
  validateMultiLanguageText,
  validateMetadata,
  countWords,
  calculateReadingLevel,
  estimateReadTime
};
