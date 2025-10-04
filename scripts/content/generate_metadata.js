#!/usr/bin/env node

/**
 * Metadata Generator
 *
 * Auto-generates or updates metadata for content files including:
 * - Estimated read time (from word count)
 * - Tags (from content analysis)
 * - Difficulty level suggestions
 * - Related conditions/medications extraction
 *
 * Usage:
 *   node scripts/content/generate_metadata.js <file-or-directory>
 *   node scripts/content/generate_metadata.js --dry-run content/articles/
 */

const fs = require('fs');
const path = require('path');

// Configuration
const WORDS_PER_MINUTE = 200;
const COMMON_MEDICAL_TERMS = require('./medical_terms.json').terms || [];

// Results tracking
const results = {
  processed: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  changes: []
};

/**
 * Count words in text
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculate estimated read time
 */
function calculateReadTime(text) {
  const wordCount = countWords(text);
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/**
 * Extract keywords from text
 */
function extractKeywords(text, maxKeywords = 10) {
  if (!text || typeof text !== 'string') return [];

  // Convert to lowercase and remove special characters
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ');

  // Common English stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
  ]);

  // Extract words
  const words = normalized.split(/\s+/).filter(word => {
    return word.length > 3 && !stopWords.has(word);
  });

  // Count word frequency
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Extract medical conditions (ICD-10 codes) from text
 */
function extractConditions(text, category) {
  const conditions = [];

  // Common chronic disease ICD-10 codes
  const conditionPatterns = {
    'diabetes': ['E11', 'E10'],
    'hypertension': ['I10', 'I11', 'I12', 'I13'],
    'heart disease': ['I25', 'I50'],
    'copd': ['J44'],
    'asthma': ['J45'],
    'arthritis': ['M15', 'M16', 'M17', 'M18', 'M19'],
    'kidney disease': ['N18'],
    'stroke': ['I63', 'I64'],
    'cholesterol': ['E78'],
    'gout': ['M10'],
    'depression': ['F32', 'F33'],
    'dementia': ['F00', 'F01', 'F02', 'F03'],
    'alzheimer': ['F00'],
    'osteoporosis': ['M80', 'M81'],
    'gerd': ['K21'],
    'thyroid': ['E03', 'E04', 'E05']
  };

  const lowerText = text.toLowerCase();

  Object.entries(conditionPatterns).forEach(([condition, codes]) => {
    if (lowerText.includes(condition)) {
      conditions.push(...codes);
    }
  });

  // Remove duplicates
  return [...new Set(conditions)];
}

/**
 * Extract medication references from text
 */
function extractMedications(text) {
  // Common medications mentioned in content
  const medications = [
    'metformin', 'amlodipine', 'atorvastatin', 'aspirin', 'losartan',
    'omeprazole', 'simvastatin', 'clopidogrel', 'gliclazide', 'enalapril',
    'salbutamol', 'insulin', 'furosemide', 'warfarin', 'paracetamol',
    'ibuprofen', 'allopurinol', 'levothyroxine', 'bisoprolol', 'ramipril'
  ];

  const found = [];
  const lowerText = text.toLowerCase();

  medications.forEach(med => {
    if (lowerText.includes(med)) {
      found.push(med);
    }
  });

  return found;
}

/**
 * Suggest difficulty level based on content analysis
 */
function suggestDifficulty(text) {
  const wordCount = countWords(text);

  // Simple heuristics based on length and complexity
  if (wordCount < 500) {
    return 'beginner';
  } else if (wordCount < 1000) {
    return 'intermediate';
  }

  // Check for medical jargon density
  const medicalTerms = [
    'pathophysiology', 'etiology', 'pharmacokinetics', 'contraindication',
    'adverse', 'efficacy', 'metabolism', 'therapeutic', 'diagnosis',
    'prognosis', 'syndrome', 'chronic', 'acute'
  ];

  const lowerText = text.toLowerCase();
  const jargonCount = medicalTerms.filter(term => lowerText.includes(term)).length;

  if (jargonCount > 3) {
    return 'advanced';
  } else if (jargonCount > 1) {
    return 'intermediate';
  }

  return 'beginner';
}

/**
 * Generate comprehensive metadata for content
 */
function generateMetadata(content) {
  const newMetadata = {};
  const suggestions = {};

  // Get English body for analysis
  const bodyText = content.body?.en || '';
  const titleText = content.title?.en || '';
  const descText = content.description?.en || '';
  const fullText = `${titleText} ${descText} ${bodyText}`;

  // Estimated read time
  if (!content.metadata?.estimatedReadTime && bodyText) {
    newMetadata.estimatedReadTime = calculateReadTime(bodyText);
  } else if (content.metadata?.estimatedReadTime) {
    const calculated = calculateReadTime(bodyText);
    if (Math.abs(calculated - content.metadata.estimatedReadTime) > 1) {
      suggestions.estimatedReadTime = {
        current: content.metadata.estimatedReadTime,
        suggested: calculated,
        reason: `Based on ${countWords(bodyText)} words`
      };
    }
  }

  // Tags
  if (!content.metadata?.tags || content.metadata.tags.length < 2) {
    const extractedKeywords = extractKeywords(fullText, 8);

    // Add category-specific tags
    const categoryTags = {
      'chronic_disease': ['chronic disease', 'management', 'health'],
      'medication': ['medication', 'medicine', 'prescription'],
      'general_health': ['health', 'wellness', 'lifestyle']
    };

    const baseTags = categoryTags[content.category] || [];
    newMetadata.tags = [...new Set([...baseTags, ...extractedKeywords])].slice(0, 10);
  }

  // Difficulty level
  if (!content.metadata?.difficulty && bodyText) {
    newMetadata.difficulty = suggestDifficulty(bodyText);
  }

  // Related conditions (ICD-10 codes)
  if (!content.metadata?.relatedConditions && content.category === 'chronic_disease') {
    const conditions = extractConditions(fullText, content.category);
    if (conditions.length > 0) {
      newMetadata.relatedConditions = conditions;
    }
  }

  // Related medications
  if (!content.metadata?.relatedMedications && content.category === 'medication') {
    const medications = extractMedications(fullText);
    if (medications.length > 0) {
      // These would be medication IDs in production
      newMetadata.relatedMedications = medications;
      suggestions.relatedMedications = {
        detected: medications,
        note: 'Replace with actual medication UUIDs from database'
      };
    }
  }

  return { newMetadata, suggestions };
}

/**
 * Process a single file
 */
function processFile(filePath, dryRun = false) {
  results.processed++;

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let content;

    try {
      content = JSON.parse(fileContent);
    } catch (parseError) {
      results.errors++;
      console.error(`❌ ${path.basename(filePath)}: JSON parse error - ${parseError.message}`);
      return;
    }

    // Generate metadata
    const { newMetadata, suggestions } = generateMetadata(content);

    if (Object.keys(newMetadata).length === 0 && Object.keys(suggestions).length === 0) {
      results.skipped++;
      return;
    }

    // Update content metadata
    if (!content.metadata) {
      content.metadata = {};
    }

    Object.assign(content.metadata, newMetadata);

    // Log changes
    const fileName = path.basename(filePath);
    const changes = {
      file: fileName,
      added: newMetadata,
      suggestions
    };

    results.changes.push(changes);

    // Write back to file unless dry-run
    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      results.updated++;
      console.log(`✓ Updated ${fileName}`);
    } else {
      console.log(`[DRY RUN] Would update ${fileName}`);
    }

    // Show what was added
    if (Object.keys(newMetadata).length > 0) {
      console.log(`  Added metadata:`);
      Object.entries(newMetadata).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(`    ${key}: [${value.join(', ')}]`);
        } else {
          console.log(`    ${key}: ${value}`);
        }
      });
    }

    // Show suggestions
    if (Object.keys(suggestions).length > 0) {
      console.log(`  Suggestions:`);
      Object.entries(suggestions).forEach(([key, value]) => {
        if (value.current !== undefined) {
          console.log(`    ${key}: ${value.current} → ${value.suggested} (${value.reason})`);
        } else {
          console.log(`    ${key}: ${JSON.stringify(value)}`);
        }
      });
    }

  } catch (error) {
    results.errors++;
    console.error(`❌ ${path.basename(filePath)}: ${error.message}`);
  }
}

/**
 * Process directory recursively
 */
function processDirectory(dirPath, dryRun, pattern = /\.json$/) {
  const entries = fs.readdirSync(dirPath);

  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath, dryRun, pattern);
    } else if (stat.isFile() && pattern.test(entry)) {
      processFile(fullPath, dryRun);
    }
  });
}

/**
 * Print summary
 */
function printSummary(dryRun) {
  console.log('\n=== Metadata Generation Summary ===\n');
  console.log(`Files processed: ${results.processed}`);
  console.log(`Files updated: ${dryRun ? 0 : results.updated}`);
  console.log(`Files skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);
  console.log('');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No files were modified');
  }

  console.log('===================================\n');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Metadata Generator

Usage:
  node generate_metadata.js [options] <file-or-directory>

Options:
  --dry-run    Preview changes without modifying files
  --help, -h   Show this help message

Examples:
  node generate_metadata.js content/articles/
  node generate_metadata.js --dry-run content/articles/diabetes.json

Generated Metadata:
  • estimatedReadTime - Based on word count (${WORDS_PER_MINUTE} words/min)
  • tags - Keywords extracted from content
  • difficulty - Suggested based on length and complexity
  • relatedConditions - ICD-10 codes detected in content
  • relatedMedications - Medication references found
    `);
    process.exit(0);
  }

  let dryRun = false;
  let target = null;

  // Parse arguments
  args.forEach(arg => {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('--')) {
      target = arg;
    }
  });

  if (!target) {
    console.error('Error: No target file or directory specified');
    process.exit(1);
  }

  if (!fs.existsSync(target)) {
    console.error(`Error: Path does not exist: ${target}`);
    process.exit(1);
  }

  const stat = fs.statSync(target);

  console.log(`Generating metadata${dryRun ? ' (DRY RUN)' : ''}...\n`);

  if (stat.isDirectory()) {
    processDirectory(target, dryRun);
  } else if (stat.isFile()) {
    processFile(target, dryRun);
  } else {
    console.error(`Error: Invalid target: ${target}`);
    process.exit(1);
  }

  printSummary(dryRun);
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  generateMetadata,
  calculateReadTime,
  extractKeywords,
  extractConditions,
  extractMedications,
  suggestDifficulty
};
