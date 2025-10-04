#!/usr/bin/env node

/**
 * Translation Completeness Checker
 *
 * Verifies that all content has translations in all 4 required languages (MS, EN, ZH, TA).
 * Checks for missing translations, empty strings, and translation quality indicators.
 *
 * Usage:
 *   node scripts/content/check_translations.js <file-or-directory>
 *   node scripts/content/check_translations.js --report summary content/articles/
 */

const fs = require('fs');
const path = require('path');

// Required languages
const REQUIRED_LANGUAGES = ['ms', 'en', 'zh', 'ta'];

const LANGUAGE_NAMES = {
  ms: 'Malay',
  en: 'English',
  zh: 'Chinese',
  ta: 'Tamil'
};

// Results tracking
const results = {
  totalFiles: 0,
  fullyTranslated: 0,
  partiallyTranslated: 0,
  missingTranslations: 0,
  files: []
};

/**
 * Count words in text
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if a translation appears to be machine-translated or placeholder
 */
function detectPlaceholderText(text, language) {
  if (!text || typeof text !== 'string') return false;

  const placeholders = [
    '[translation needed]',
    '[to be translated]',
    'TODO',
    'placeholder',
    'lorem ipsum',
    'test content'
  ];

  const lowerText = text.toLowerCase();
  return placeholders.some(placeholder => lowerText.includes(placeholder));
}

/**
 * Check translation completeness for a field
 */
function checkFieldTranslations(fieldName, value) {
  const status = {
    field: fieldName,
    complete: true,
    languages: {},
    missingLanguages: [],
    emptyLanguages: [],
    placeholderLanguages: [],
    wordCounts: {}
  };

  if (!value || typeof value !== 'object') {
    status.complete = false;
    status.missingLanguages = REQUIRED_LANGUAGES;
    return status;
  }

  REQUIRED_LANGUAGES.forEach(lang => {
    const translation = value[lang];

    if (!translation) {
      status.complete = false;
      status.missingLanguages.push(lang);
      status.languages[lang] = 'missing';
    } else if (typeof translation !== 'string') {
      status.complete = false;
      status.languages[lang] = 'invalid_type';
    } else if (translation.trim().length === 0) {
      status.complete = false;
      status.emptyLanguages.push(lang);
      status.languages[lang] = 'empty';
    } else if (detectPlaceholderText(translation, lang)) {
      status.complete = false;
      status.placeholderLanguages.push(lang);
      status.languages[lang] = 'placeholder';
    } else {
      status.languages[lang] = 'complete';
      status.wordCounts[lang] = countWords(translation);
    }
  });

  return status;
}

/**
 * Check translation balance (ensure translations are similar in length)
 */
function checkTranslationBalance(wordCounts) {
  if (Object.keys(wordCounts).length < 2) return { balanced: true };

  const counts = Object.values(wordCounts);
  const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const maxDeviation = Math.max(...counts.map(count => Math.abs(count - avg)));
  const deviationPercent = (maxDeviation / avg) * 100;

  // Allow 30% deviation (translations naturally vary in length)
  const balanced = deviationPercent <= 30;

  return {
    balanced,
    average: Math.round(avg),
    maxDeviation: Math.round(maxDeviation),
    deviationPercent: Math.round(deviationPercent),
    wordCounts
  };
}

/**
 * Check a single content file
 */
function checkFile(filePath) {
  results.totalFiles++;

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let content;

    try {
      content = JSON.parse(fileContent);
    } catch (parseError) {
      results.files.push({
        file: filePath,
        status: 'error',
        error: `JSON parse error: ${parseError.message}`,
        fields: []
      });
      return;
    }

    // Check title, description, and body
    const titleStatus = checkFieldTranslations('title', content.title);
    const descStatus = checkFieldTranslations('description', content.description);
    const bodyStatus = checkFieldTranslations('body', content.body);

    const allFields = [titleStatus, descStatus, bodyStatus];
    const allComplete = allFields.every(field => field.complete);

    // Check translation balance
    const balanceCheck = checkTranslationBalance({
      ...bodyStatus.wordCounts
    });

    const fileResult = {
      file: filePath,
      status: allComplete ? 'complete' : 'incomplete',
      fields: allFields,
      balance: balanceCheck,
      missingCount: 0
    };

    // Count total missing translations
    allFields.forEach(field => {
      fileResult.missingCount += field.missingLanguages.length +
                                  field.emptyLanguages.length +
                                  field.placeholderLanguages.length;
    });

    if (allComplete) {
      results.fullyTranslated++;
    } else if (fileResult.missingCount > 0 && fileResult.missingCount < REQUIRED_LANGUAGES.length * allFields.length) {
      results.partiallyTranslated++;
    } else {
      results.missingTranslations++;
    }

    results.files.push(fileResult);

  } catch (error) {
    results.files.push({
      file: filePath,
      status: 'error',
      error: `File read error: ${error.message}`,
      fields: []
    });
  }
}

/**
 * Check directory recursively
 */
function checkDirectory(dirPath, pattern = /\.json$/) {
  const entries = fs.readdirSync(dirPath);

  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      checkDirectory(fullPath, pattern);
    } else if (stat.isFile() && pattern.test(entry)) {
      checkFile(fullPath);
    }
  });
}

/**
 * Print summary report
 */
function printSummary() {
  console.log('\n=== Translation Completeness Summary ===\n');
  console.log(`Total files checked: ${results.totalFiles}`);
  console.log(`Fully translated: ${results.fullyTranslated} (${Math.round(results.fullyTranslated / results.totalFiles * 100)}%)`);
  console.log(`Partially translated: ${results.partiallyTranslated} (${Math.round(results.partiallyTranslated / results.totalFiles * 100)}%)`);
  console.log(`Missing translations: ${results.missingTranslations} (${Math.round(results.missingTranslations / results.totalFiles * 100)}%)`);
  console.log('');

  // Language-specific stats
  const langStats = {};
  REQUIRED_LANGUAGES.forEach(lang => {
    langStats[lang] = { complete: 0, incomplete: 0, total: 0 };
  });

  results.files.forEach(fileResult => {
    if (fileResult.status === 'error') return;

    fileResult.fields.forEach(field => {
      REQUIRED_LANGUAGES.forEach(lang => {
        langStats[lang].total++;
        if (field.languages[lang] === 'complete') {
          langStats[lang].complete++;
        } else {
          langStats[lang].incomplete++;
        }
      });
    });
  });

  console.log('=== Translation Status by Language ===\n');
  REQUIRED_LANGUAGES.forEach(lang => {
    const stats = langStats[lang];
    const percent = stats.total > 0 ? Math.round(stats.complete / stats.total * 100) : 0;
    console.log(`${LANGUAGE_NAMES[lang]} (${lang}): ${stats.complete}/${stats.total} (${percent}%)`);
  });

  console.log('\n======================================\n');
}

/**
 * Print detailed report
 */
function printDetailed() {
  console.log('\n=== Detailed Translation Report ===\n');

  results.files.forEach(fileResult => {
    const fileName = path.basename(fileResult.file);

    if (fileResult.status === 'error') {
      console.log(`\n❌ ${fileName} - ERROR`);
      console.log(`   ${fileResult.error}`);
      return;
    }

    if (fileResult.status === 'complete') {
      console.log(`\n✓ ${fileName} - COMPLETE`);

      // Show word counts and balance
      if (fileResult.balance && Object.keys(fileResult.balance.wordCounts || {}).length > 0) {
        console.log('   Word counts:');
        REQUIRED_LANGUAGES.forEach(lang => {
          const count = fileResult.balance.wordCounts[lang];
          if (count) {
            console.log(`     ${LANGUAGE_NAMES[lang]}: ${count} words`);
          }
        });

        if (!fileResult.balance.balanced) {
          console.log(`   ⚠️  Translation length variance: ${fileResult.balance.deviationPercent}% (avg: ${fileResult.balance.average} words)`);
        }
      }
    } else {
      console.log(`\n⚠️  ${fileName} - INCOMPLETE (${fileResult.missingCount} issues)`);

      fileResult.fields.forEach(field => {
        if (!field.complete) {
          console.log(`   ${field.field}:`);

          if (field.missingLanguages.length > 0) {
            console.log(`     Missing: ${field.missingLanguages.map(l => LANGUAGE_NAMES[l]).join(', ')}`);
          }

          if (field.emptyLanguages.length > 0) {
            console.log(`     Empty: ${field.emptyLanguages.map(l => LANGUAGE_NAMES[l]).join(', ')}`);
          }

          if (field.placeholderLanguages.length > 0) {
            console.log(`     Placeholder: ${field.placeholderLanguages.map(l => LANGUAGE_NAMES[l]).join(', ')}`);
          }
        }
      });
    }
  });

  console.log('\n===================================\n');
}

/**
 * Generate CSV report
 */
function generateCSV() {
  const lines = [];
  lines.push('File,Status,Missing Count,Title MS,Title EN,Title ZH,Title TA,Description MS,Description EN,Description ZH,Description TA,Body MS,Body EN,Body ZH,Body TA');

  results.files.forEach(fileResult => {
    if (fileResult.status === 'error') return;

    const fileName = path.basename(fileResult.file);
    const row = [
      fileName,
      fileResult.status,
      fileResult.missingCount
    ];

    fileResult.fields.forEach(field => {
      REQUIRED_LANGUAGES.forEach(lang => {
        row.push(field.languages[lang] || 'missing');
      });
    });

    lines.push(row.join(','));
  });

  return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Translation Completeness Checker

Usage:
  node check_translations.js [options] <file-or-directory>

Options:
  --report <type>    Report type: summary, detailed, csv (default: detailed)
  --help, -h         Show this help message

Examples:
  node check_translations.js content/articles/
  node check_translations.js --report summary content/
  node check_translations.js --report csv content/ > report.csv

Checks:
  • All 4 languages present (MS, EN, ZH, TA)
  • No empty translations
  • No placeholder text
  • Translation length balance
    `);
    process.exit(0);
  }

  let reportType = 'detailed';
  let target = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--report' && i + 1 < args.length) {
      reportType = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      target = args[i];
    }
  }

  if (!target) {
    console.error('Error: No target file or directory specified');
    process.exit(1);
  }

  if (!fs.existsSync(target)) {
    console.error(`Error: Path does not exist: ${target}`);
    process.exit(1);
  }

  const stat = fs.statSync(target);

  if (stat.isDirectory()) {
    checkDirectory(target);
  } else if (stat.isFile()) {
    checkFile(target);
  } else {
    console.error(`Error: Invalid target: ${target}`);
    process.exit(1);
  }

  // Print appropriate report
  if (reportType === 'summary') {
    printSummary();
  } else if (reportType === 'csv') {
    console.log(generateCSV());
  } else {
    printDetailed();
    printSummary();
  }

  // Exit with error code if there are incomplete translations
  const exitCode = results.fullyTranslated === results.totalFiles ? 0 : 1;
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  checkFieldTranslations,
  checkTranslationBalance,
  detectPlaceholderText,
  REQUIRED_LANGUAGES,
  LANGUAGE_NAMES
};
