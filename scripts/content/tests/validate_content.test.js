#!/usr/bin/env node

/**
 * Validation Script Test Suite
 *
 * Tests content validation logic including:
 * - Required field validation
 * - Multi-language support
 * - Word count and reading level checks
 * - Metadata validation
 */

const fs = require('fs');
const path = require('path');

// Import validation module
const validateModule = require('../validate_content.js');

// Test results tracking
const tests = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Test helper: Assert equality
 */
function assertEqual(actual, expected, testName) {
  tests.total++;
  if (actual === expected) {
    tests.passed++;
    console.log(`✓ ${testName}`);
    return true;
  } else {
    tests.failed++;
    tests.errors.push({
      test: testName,
      expected,
      actual
    });
    console.error(`✗ ${testName}`);
    console.error(`  Expected: ${expected}, Got: ${actual}`);
    return false;
  }
}

/**
 * Test helper: Assert truthy
 */
function assertTrue(value, testName) {
  tests.total++;
  if (value) {
    tests.passed++;
    console.log(`✓ ${testName}`);
    return true;
  } else {
    tests.failed++;
    tests.errors.push({
      test: testName,
      expected: 'truthy',
      actual: value
    });
    console.error(`✗ ${testName}`);
    return false;
  }
}

/**
 * Test helper: Assert array contains
 */
function assertArrayContains(array, substring, testName) {
  tests.total++;
  const found = array.some(item =>
    typeof item === 'string' && item.includes(substring)
  );

  if (found) {
    tests.passed++;
    console.log(`✓ ${testName}`);
    return true;
  } else {
    tests.failed++;
    tests.errors.push({
      test: testName,
      expected: `Array containing "${substring}"`,
      actual: array
    });
    console.error(`✗ ${testName}`);
    return false;
  }
}

/**
 * Test: Valid content passes validation
 */
function testValidContentPasses() {
  console.log('\n=== Test: Valid Content ===');

  const validContent = {
    type: 'article',
    category: 'chronic_disease',
    title: {
      ms: 'Pengurusan Diabetes',
      en: 'Diabetes Management',
      zh: '糖尿病管理',
      ta: 'நீரிழிவு நோய் மேலாண்மை'
    },
    description: {
      ms: 'Panduan lengkap untuk menguruskan diabetes jenis 2. Belajar tentang diet, senaman, dan ubat-ubatan yang betul untuk mengawal gula darah anda.',
      en: 'Complete guide to managing type 2 diabetes. Learn about proper diet, exercise, and medications to control your blood sugar levels effectively.',
      zh: '管理2型糖尿病的完整指南。了解适当的饮食、运动和药物，以有效控制血糖水平。学习如何监测血糖并避免并发症。',
      ta: 'வகை 2 நீரிழிவு நோயை நிர்வகிப்பதற்கான முழுமையான வழிகாட்டி. உங்கள் இரத்த சர்க்கரை அளவை திறம்பட கட்டுப்படுத்த சரியான உணவு, உடற்பயிற்சி மற்றும் மருந்துகளைப் பற்றி அறியவும்.'
    },
    body: {
      ms: 'Diabetes jenis 2 adalah keadaan kronik yang memerlukan pengurusan yang teliti. Ia berlaku apabila badan anda tidak menghasilkan insulin yang mencukupi atau tidak dapat menggunakan insulin dengan berkesan. Ini menyebabkan paras gula dalam darah meningkat. Pengurusan diabetes yang baik melibatkan gabungan diet yang sihat, senaman yang kerap, ubat-ubatan yang sesuai, dan pemantauan gula darah yang kerap. Dengan pengurusan yang betul, anda boleh menjalani kehidupan yang sihat dan aktif sambil mengawal diabetes anda. Pastikan anda bekerja rapat dengan doktor anda untuk membuat pelan rawatan yang sesuai dengan keperluan anda. Diet yang sihat adalah asas pengurusan diabetes. Elakkan makanan tinggi gula dan karbohidrat mudah. Pilih karbohidrat kompleks seperti bijirin penuh, sayur-sayuran, dan buah-buahan dengan moderasi. Makan pada waktu yang tetap dan kawal saiz hidangan anda. Senaman juga penting - cuba bersenam sekurang-kurangnya 30 minit sehari, 5 hari seminggu. Aktiviti seperti berjalan kaki, berenang, atau berbasikal adalah pilihan yang baik. Jangan lupa untuk memeriksa gula darah anda seperti yang disyorkan oleh doktor. Rekodkan bacaan anda dan bawa ke setiap temu janji doktor. Jika anda mengalami simptom seperti dahaga yang berlebihan, kerap membuang air kecil, atau pandangan kabur, hubungi doktor anda dengan segera.',
      en: 'Type 2 diabetes is a chronic condition that requires careful management. It occurs when your body does not produce enough insulin or cannot use insulin effectively. This causes blood sugar levels to rise. Good diabetes management involves a combination of healthy diet, regular exercise, appropriate medications, and frequent blood sugar monitoring. With proper management, you can live a healthy and active life while controlling your diabetes. Make sure you work closely with your doctor to create a treatment plan that suits your needs. A healthy diet is the foundation of diabetes management. Avoid foods high in sugar and simple carbohydrates. Choose complex carbohydrates such as whole grains, vegetables, and fruits in moderation. Eat at regular times and control your portion sizes. Exercise is also important - try to exercise for at least 30 minutes a day, 5 days a week. Activities such as walking, swimming, or cycling are good choices. Do not forget to check your blood sugar as recommended by your doctor. Record your readings and bring them to every doctor appointment. If you experience symptoms such as excessive thirst, frequent urination, or blurred vision, contact your doctor immediately.',
      zh: '2型糖尿病是一种需要仔细管理的慢性疾病。当您的身体无法产生足够的胰岛素或无法有效使用胰岛素时，就会发生这种情况。这会导致血糖水平升高。良好的糖尿病管理包括健康饮食、定期运动、适当的药物治疗和频繁的血糖监测的组合。通过适当的管理，您可以在控制糖尿病的同时过上健康积极的生活。确保您与医生密切合作，制定适合您需求的治疗计划。健康饮食是糖尿病管理的基础。避免高糖和简单碳水化合物的食物。适度选择复杂碳水化合物，如全谷物、蔬菜和水果。定时进餐并控制份量。运动也很重要 - 每周5天，每天至少运动30分钟。步行、游泳或骑自行车等活动都是不错的选择。不要忘记按照医生的建议检查血糖。记录您的读数并在每次就诊时带上。如果您出现口渴过度、尿频或视力模糊等症状，请立即联系医生。',
      ta: 'வகை 2 நீரிழிவு நோய் கவனமாக நிர்வகிக்க வேண்டிய ஒரு நாள்பட்ட நிலை. உங்கள் உடல் போதுமான இன்சுலின் உற்பத்தி செய்யாதபோது அல்லது இன்சுலினை திறம்பட பயன்படுத்த முடியாதபோது இது ஏற்படுகிறது. இது இரத்த சர்க்கரை அளவு உயர காரணமாகிறது. நல்ல நீரிழிவு மேலாண்மை ஆரோக்கியமான உணவு, வழக்கமான உடற்பயிற்சி, பொருத்தமான மருந்துகள் மற்றும் அடிக்கடி இரத்த சர்க்கரை கண்காணிப்பு ஆகியவற்றின் கலவையை உள்ளடக்கியது. சரியான மேலாண்மையுடன், உங்கள் நீரிழிவை கட்டுப்படுத்தும் போது ஆரோக்கியமான மற்றும் சுறுசுறுப்பான வாழ்க்கையை நீங்கள் வாழலாம். உங்கள் தேவைகளுக்கு ஏற்ற சிகிச்சை திட்டத்தை உருவாக்க உங்கள் மருத்துவருடன் நெருக்கமாக பணியாற்றுங்கள். ஆரோக்கியமான உணவு நீரிழிவு மேலாண்மையின் அடிப்படை. அதிக சர்க்கரை மற்றும் எளிய கார்போஹைட்ரேட்டுகள் கொண்ட உணவுகளை தவிர்க்கவும். முழு தானியங்கள், காய்கறிகள் மற்றும் பழங்கள் போன்ற சிக்கலான கார்போஹைட்ரேட்டுகளை மிதமாக தேர்வு செய்யவும். வழக்கமான நேரங்களில் சாப்பிடுங்கள் மற்றும் உங்கள் பகுதி அளவுகளை கட்டுப்படுத்துங்கள். உடற்பயிற்சியும் முக்கியம் - வாரத்தில் 5 நாட்கள், நாளொன்றுக்கு குறைந்தது 30 நிமிடங்கள் உடற்பயிற்சி செய்ய முயற்சிக்கவும். நடைபயிற்சி, நீச்சல் அல்லது சைக்கிள் ஓட்டுதல் போன்ற செயல்பாடுகள் நல்ல தேர்வுகள். உங்கள் மருத்துவர் பரிந்துரைத்தபடி உங்கள் இரத்த சர்க்கரையை சரிபார்க்க மறக்காதீர்கள். உங்கள் அளவீடுகளை பதிவு செய்து ஒவ்வொரு மருத்துவர் சந்திப்பிற்கும் கொண்டு வாருங்கள். அதிகப்படியான தாகம், அடிக்கடி சிறுநீர் கழித்தல் அல்லது மங்கலான பார்வை போன்ற அறிகுறிகளை நீங்கள் அனுபவித்தால், உடனடியாக உங்கள் மருத்துவரை தொடர்பு கொள்ளுங்கள்.'
    },
    metadata: {
      estimatedReadTime: 5,
      difficulty: 'beginner',
      tags: ['diabetes', 'chronic disease', 'health management'],
      relatedConditions: ['E11'],
      relatedMedications: [],
      author: 'Dr. Sarah Chen, MD',
      reviewedBy: 'Dr. Ahmad Ibrahim, MBBS'
    }
  };

  const result = validateModule.validateContent(validContent, 'test.json');

  assertEqual(result.errors.length, 0, 'Valid content should have no errors');
  assertTrue(result.warnings.length >= 0, 'Should return warnings array');
}

/**
 * Test: Missing required fields
 */
function testMissingRequiredFields() {
  console.log('\n=== Test: Missing Required Fields ===');

  // Missing type
  const noType = {
    category: 'chronic_disease',
    title: { en: 'Test' },
    description: { en: 'Test description with enough characters to pass minimum length requirement for validation' },
    body: { en: 'Test body content with enough words to pass the minimum word count validation requirement. We need more text here to reach at least 300 words for article validation to succeed without errors. Adding more content now to ensure we meet the minimum requirements. This is test content for validation purposes only. More text here. Even more text to reach the word count. Keep adding words until we reach minimum. Almost there now. Just a bit more content needed. Getting closer to the target word count. Nearly finished with the minimum word requirement. Just about done with adding test content here. Final stretch of adding words to meet validation requirements. This should be enough now to pass the minimum word count validation for articles which requires at least three hundred words of actual content in the body field to be considered valid according to the validation rules that we have defined in our content management system for educational health articles.' }
  };

  const result1 = validateModule.validateContent(noType, 'test.json');
  assertArrayContains(result1.errors, 'type', 'Missing type should produce error');

  // Missing category
  const noCategory = {
    type: 'article',
    title: { en: 'Test' },
    description: { en: 'Test description with enough characters to pass minimum length requirement for validation' },
    body: { en: 'Test body content with enough words to pass the minimum word count validation requirement. We need more text here to reach at least 300 words for article validation to succeed without errors. Adding more content now to ensure we meet the minimum requirements. This is test content for validation purposes only. More text here. Even more text to reach the word count. Keep adding words until we reach minimum. Almost there now. Just a bit more content needed. Getting closer to the target word count. Nearly finished with the minimum word requirement. Just about done with adding test content here. Final stretch of adding words to meet validation requirements. This should be enough now to pass the minimum word count validation for articles which requires at least three hundred words of actual content in the body field to be considered valid according to the validation rules that we have defined in our content management system for educational health articles.' }
  };

  const result2 = validateModule.validateContent(noCategory, 'test.json');
  assertArrayContains(result2.errors, 'category', 'Missing category should produce error');

  // Missing title
  const noTitle = {
    type: 'article',
    category: 'chronic_disease',
    description: { en: 'Test description with enough characters to pass minimum length requirement for validation' },
    body: { en: 'Test body content with enough words to pass the minimum word count validation requirement. We need more text here to reach at least 300 words for article validation to succeed without errors. Adding more content now to ensure we meet the minimum requirements. This is test content for validation purposes only. More text here. Even more text to reach the word count. Keep adding words until we reach minimum. Almost there now. Just a bit more content needed. Getting closer to the target word count. Nearly finished with the minimum word requirement. Just about done with adding test content here. Final stretch of adding words to meet validation requirements. This should be enough now to pass the minimum word count validation for articles which requires at least three hundred words of actual content in the body field to be considered valid according to the validation rules that we have defined in our content management system for educational health articles.' }
  };

  const result3 = validateModule.validateContent(noTitle, 'test.json');
  assertArrayContains(result3.errors, 'title', 'Missing title should produce error');
}

/**
 * Test: Invalid content type and category
 */
function testInvalidTypeAndCategory() {
  console.log('\n=== Test: Invalid Type and Category ===');

  const invalidType = {
    type: 'invalid_type',
    category: 'chronic_disease',
    title: { en: 'Test' },
    description: { en: 'Test description with enough characters to pass minimum length requirement for validation' },
    body: { en: 'Test body content with enough words to pass the minimum word count validation requirement. We need more text here to reach at least 300 words for article validation to succeed without errors. Adding more content now to ensure we meet the minimum requirements. This is test content for validation purposes only. More text here. Even more text to reach the word count. Keep adding words until we reach minimum. Almost there now. Just a bit more content needed. Getting closer to the target word count. Nearly finished with the minimum word requirement. Just about done with adding test content here. Final stretch of adding words to meet validation requirements. This should be enough now to pass the minimum word count validation for articles which requires at least three hundred words of actual content in the body field to be considered valid according to the validation rules that we have defined in our content management system for educational health articles.' }
  };

  const result1 = validateModule.validateContent(invalidType, 'test.json');
  assertArrayContains(result1.errors, 'type', 'Invalid type should produce error');

  const invalidCategory = {
    type: 'article',
    category: 'invalid_category',
    title: { en: 'Test' },
    description: { en: 'Test description with enough characters to pass minimum length requirement for validation' },
    body: { en: 'Test body content with enough words to pass the minimum word count validation requirement. We need more text here to reach at least 300 words for article validation to succeed without errors. Adding more content now to ensure we meet the minimum requirements. This is test content for validation purposes only. More text here. Even more text to reach the word count. Keep adding words until we reach minimum. Almost there now. Just a bit more content needed. Getting closer to the target word count. Nearly finished with the minimum word requirement. Just about done with adding test content here. Final stretch of adding words to meet validation requirements. This should be enough now to pass the minimum word count validation for articles which requires at least three hundred words of actual content in the body field to be considered valid according to the validation rules that we have defined in our content management system for educational health articles.' }
  };

  const result2 = validateModule.validateContent(invalidCategory, 'test.json');
  assertArrayContains(result2.errors, 'category', 'Invalid category should produce error');
}

/**
 * Test: Word count validation
 */
function testWordCountValidation() {
  console.log('\n=== Test: Word Count Validation ===');

  // Too short
  const tooShort = {
    type: 'article',
    category: 'chronic_disease',
    title: { en: 'Test' },
    description: { en: 'Test description with enough characters to pass minimum length requirement for validation' },
    body: { en: 'Too short.' }
  };

  const result1 = validateModule.validateContent(tooShort, 'test.json');
  assertArrayContains(result1.errors, 'word count', 'Short content should produce word count error');

  // Too long (over 2000 words)
  const tooLong = {
    type: 'article',
    category: 'chronic_disease',
    title: { en: 'Test' },
    description: { en: 'Test description with enough characters to pass minimum length requirement for validation' },
    body: { en: Array(2100).fill('word').join(' ') }
  };

  const result2 = validateModule.validateContent(tooLong, 'test.json');
  assertArrayContains(result2.errors, 'word count', 'Long content should produce word count error');
}

/**
 * Test: Multi-language validation
 */
function testMultiLanguageValidation() {
  console.log('\n=== Test: Multi-language Validation ===');

  // Missing English (required)
  const noEnglish = {
    type: 'article',
    category: 'chronic_disease',
    title: { ms: 'Tajuk' },
    description: { ms: 'Deskripsi dengan cukup aksara untuk lulus keperluan panjang minimum untuk pengesahan sistem' },
    body: { ms: 'Kandungan badan ujian dengan perkataan yang cukup untuk lulus keperluan kiraan perkataan minimum pengesahan. Kami memerlukan lebih banyak teks di sini untuk mencapai sekurang-kurangnya 300 perkataan untuk pengesahan artikel berjaya tanpa ralat. Menambah lebih banyak kandungan sekarang untuk memastikan kami memenuhi keperluan minimum. Ini adalah kandungan ujian untuk tujuan pengesahan sahaja. Lebih banyak teks di sini. Lebih banyak lagi teks untuk mencapai kiraan perkataan. Terus menambah perkataan sehingga kami mencapai minimum. Hampir sampai sekarang. Hanya sedikit lagi kandungan diperlukan. Semakin dekat dengan kiraan perkataan sasaran. Hampir selesai dengan keperluan kiraan perkataan minimum. Hampir selesai menambah kandungan ujian di sini. Hampir selesai menambah perkataan untuk memenuhi keperluan pengesahan. Ini sepatutnya cukup sekarang untuk lulus pengesahan kiraan perkataan minimum untuk artikel yang memerlukan sekurang-kurangnya tiga ratus perkataan kandungan sebenar dalam medan badan untuk dianggap sah mengikut peraturan pengesahan yang telah kami tentukan dalam sistem pengurusan kandungan kami untuk artikel kesihatan pendidikan.' }
  };

  const result = validateModule.validateContent(noEnglish, 'test.json');
  assertArrayContains(result.errors, 'English', 'Missing English should produce error');
}

/**
 * Test: Description length validation
 */
function testDescriptionLengthValidation() {
  console.log('\n=== Test: Description Length ===');

  const shortDesc = {
    type: 'article',
    category: 'chronic_disease',
    title: { en: 'Test' },
    description: { en: 'Too short' },
    body: { en: 'Test body content with enough words to pass the minimum word count validation requirement. We need more text here to reach at least 300 words for article validation to succeed without errors. Adding more content now to ensure we meet the minimum requirements. This is test content for validation purposes only. More text here. Even more text to reach the word count. Keep adding words until we reach minimum. Almost there now. Just a bit more content needed. Getting closer to the target word count. Nearly finished with the minimum word requirement. Just about done with adding test content here. Final stretch of adding words to meet validation requirements. This should be enough now to pass the minimum word count validation for articles which requires at least three hundred words of actual content in the body field to be considered valid according to the validation rules that we have defined in our content management system for educational health articles.' }
  };

  const result = validateModule.validateContent(shortDesc, 'test.json');
  assertArrayContains(result.errors, 'description', 'Short description should produce error');
}

/**
 * Run all tests
 */
function runTests() {
  console.log('=== Content Validation Test Suite ===\n');
  console.log('Running automated tests for validate_content.js\n');

  testValidContentPasses();
  testMissingRequiredFields();
  testInvalidTypeAndCategory();
  testWordCountValidation();
  testMultiLanguageValidation();
  testDescriptionLengthValidation();

  console.log('\n=== Test Results Summary ===\n');
  console.log(`Total tests: ${tests.total}`);
  console.log(`Passed: ${tests.passed} ✓`);
  console.log(`Failed: ${tests.failed} ✗`);
  console.log('');

  if (tests.failed > 0) {
    console.log('=== Failed Tests ===\n');
    tests.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}`);
      console.log(`   Expected: ${error.expected}`);
      console.log(`   Got: ${error.actual}`);
    });
  }

  process.exit(tests.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  assertEqual,
  assertTrue,
  assertArrayContains
};
