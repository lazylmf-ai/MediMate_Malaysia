#!/usr/bin/env node
/**
 * Malaysian Cultural Data Seeding Script
 * Seeds comprehensive cultural intelligence data for MediMate Malaysia
 * Includes prayer times, holidays, medications, and multi-language content
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const PrayerTimesCalculator = require('./prayer-times-calculator');
const MalaysianHolidayGenerator = require('./holiday-calendar-generator');

class CulturalDataSeeder {
  constructor() {
    this.prayerCalculator = new PrayerTimesCalculator();
    this.holidayGenerator = new MalaysianHolidayGenerator();
    
    // Database configuration
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'medimate_dev',
      user: process.env.DB_USER || 'medimate_user',
      password: process.env.DB_PASSWORD || 'medimate_password'
    };

    this.db = null;
  }

  async initialize() {
    console.log('🚀 Initializing Cultural Data Seeder...');
    
    try {
      this.db = new Pool(this.dbConfig);
      await this.db.query('SELECT NOW()');
      console.log('✅ Database connection established');
      
      await this.createTables();
      console.log('✅ Database tables verified');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      // Prayer times table
      `CREATE TABLE IF NOT EXISTS prayer_times (
        id SERIAL PRIMARY KEY,
        city_key VARCHAR(50) NOT NULL,
        city_name VARCHAR(100) NOT NULL,
        prayer_date DATE NOT NULL,
        fajr TIME NOT NULL,
        sunrise TIME NOT NULL,
        dhuhr TIME NOT NULL,
        asr TIME NOT NULL,
        maghrib TIME NOT NULL,
        isha TIME NOT NULL,
        timezone VARCHAR(50) NOT NULL,
        calculation_method VARCHAR(20) DEFAULT 'JAKIM',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(city_key, prayer_date)
      )`,

      // Malaysian holidays table
      `CREATE TABLE IF NOT EXISTS malaysian_holidays (
        id SERIAL PRIMARY KEY,
        holiday_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        name_bm VARCHAR(200),
        name_zh VARCHAR(200),
        name_ta VARCHAR(200),
        holiday_date DATE NOT NULL,
        holiday_type VARCHAR(50) NOT NULL,
        is_federal BOOLEAN DEFAULT FALSE,
        applicable_states TEXT[],
        healthcare_impact VARCHAR(20) DEFAULT 'medium',
        description TEXT,
        cultural_significance TEXT,
        healthcare_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Malaysian medications table
      `CREATE TABLE IF NOT EXISTS malaysian_medications (
        id SERIAL PRIMARY KEY,
        medication_id VARCHAR(100) UNIQUE NOT NULL,
        generic_name VARCHAR(200) NOT NULL,
        brand_names TEXT[],
        dosage_forms TEXT[],
        strengths TEXT[],
        therapeutic_class VARCHAR(200),
        is_halal BOOLEAN DEFAULT NULL,
        halal_certification VARCHAR(100),
        is_otc BOOLEAN DEFAULT FALSE,
        prescription_required BOOLEAN DEFAULT TRUE,
        availability_status VARCHAR(50) DEFAULT 'available',
        manufacturer VARCHAR(200),
        registration_number VARCHAR(100),
        cultural_notes TEXT,
        dietary_restrictions TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Multi-language content table
      `CREATE TABLE IF NOT EXISTS multilingual_content (
        id SERIAL PRIMARY KEY,
        content_key VARCHAR(200) UNIQUE NOT NULL,
        content_type VARCHAR(50) NOT NULL, -- 'medication_instruction', 'symptom_description', etc.
        content_en TEXT NOT NULL,
        content_bm TEXT,
        content_zh TEXT,
        content_ta TEXT,
        context_tags TEXT[],
        medical_domain VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Cultural calendar integration
      `CREATE TABLE IF NOT EXISTS cultural_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(100) UNIQUE NOT NULL,
        event_name VARCHAR(200) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_pattern TEXT,
        cultural_significance TEXT,
        healthcare_considerations TEXT,
        medication_reminders_affected BOOLEAN DEFAULT FALSE,
        appointment_scheduling_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSQL of tables) {
      await this.db.query(tableSQL);
    }
  }

  /**
   * Seed prayer times data for Malaysian cities
   */
  async seedPrayerTimes() {
    console.log('📿 Seeding prayer times data...');
    
    const cities = Object.keys(this.prayerCalculator.cities);
    const startDate = new Date().toISOString().split('T')[0]; // Today
    const totalRecords = cities.length * 365; // 1 year for each city
    let recordsInserted = 0;

    for (const cityKey of cities) {
      console.log(`  Calculating prayer times for ${this.prayerCalculator.cities[cityKey].name}...`);
      
      const prayerTimesData = this.prayerCalculator.generatePrayerTimesRange(cityKey, startDate, 365);
      
      for (const dayData of prayerTimesData) {
        try {
          await this.db.query(`
            INSERT INTO prayer_times (
              city_key, city_name, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha, 
              timezone, calculation_method
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (city_key, prayer_date) DO UPDATE SET
              fajr = EXCLUDED.fajr,
              sunrise = EXCLUDED.sunrise,
              dhuhr = EXCLUDED.dhuhr,
              asr = EXCLUDED.asr,
              maghrib = EXCLUDED.maghrib,
              isha = EXCLUDED.isha
          `, [
            cityKey,
            dayData.city,
            dayData.date,
            dayData.prayers.fajr,
            dayData.prayers.sunrise,
            dayData.prayers.dhuhr,
            dayData.prayers.asr,
            dayData.prayers.maghrib,
            dayData.prayers.isha,
            dayData.timezone,
            dayData.metadata.calculationMethod
          ]);
          recordsInserted++;
        } catch (error) {
          console.warn(`    Warning: Failed to insert prayer times for ${cityKey} on ${dayData.date}:`, error.message);
        }
      }
    }

    console.log(`✅ Prayer times seeded: ${recordsInserted}/${totalRecords} records`);
  }

  /**
   * Seed Malaysian holidays data
   */
  async seedHolidays() {
    console.log('🎉 Seeding Malaysian holidays data...');
    
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1]; // Current and next year
    let recordsInserted = 0;

    for (const year of years) {
      console.log(`  Generating holidays for ${year}...`);
      const holidays = this.holidayGenerator.generateHolidayCalendar(year);
      
      for (const holiday of holidays) {
        try {
          await this.db.query(`
            INSERT INTO malaysian_holidays (
              holiday_id, name, name_bm, name_zh, name_ta, holiday_date, holiday_type,
              is_federal, applicable_states, healthcare_impact, description,
              cultural_significance, healthcare_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (holiday_id) DO UPDATE SET
              name = EXCLUDED.name,
              holiday_date = EXCLUDED.holiday_date,
              healthcare_impact = EXCLUDED.healthcare_impact
          `, [
            holiday.id,
            holiday.name,
            holiday.name_bm || null,
            holiday.name_zh || null,
            holiday.name_ta || null,
            holiday.date,
            holiday.type,
            holiday.is_federal,
            holiday.states,
            holiday.healthcare_impact,
            holiday.description,
            holiday.cultural_significance,
            holiday.healthcare_notes
          ]);
          recordsInserted++;
        } catch (error) {
          console.warn(`    Warning: Failed to insert holiday ${holiday.id}:`, error.message);
        }
      }
    }

    console.log(`✅ Malaysian holidays seeded: ${recordsInserted} records`);
  }

  /**
   * Seed Malaysian medications database
   */
  async seedMalaysianMedications() {
    console.log('💊 Seeding Malaysian medications data...');
    
    const medications = await this.loadMedicationData();
    let recordsInserted = 0;

    for (const med of medications) {
      try {
        await this.db.query(`
          INSERT INTO malaysian_medications (
            medication_id, generic_name, brand_names, dosage_forms, strengths,
            therapeutic_class, is_halal, halal_certification, is_otc, prescription_required,
            availability_status, manufacturer, registration_number, cultural_notes, dietary_restrictions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (medication_id) DO UPDATE SET
            brand_names = EXCLUDED.brand_names,
            availability_status = EXCLUDED.availability_status,
            is_halal = EXCLUDED.is_halal
        `, [
          med.medication_id,
          med.generic_name,
          med.brand_names,
          med.dosage_forms,
          med.strengths,
          med.therapeutic_class,
          med.is_halal,
          med.halal_certification,
          med.is_otc,
          med.prescription_required,
          med.availability_status,
          med.manufacturer,
          med.registration_number,
          med.cultural_notes,
          med.dietary_restrictions
        ]);
        recordsInserted++;
      } catch (error) {
        console.warn(`    Warning: Failed to insert medication ${med.medication_id}:`, error.message);
      }
    }

    console.log(`✅ Malaysian medications seeded: ${recordsInserted} records`);
  }

  /**
   * Seed multi-language content
   */
  async seedMultilingualContent() {
    console.log('🌐 Seeding multilingual content...');
    
    const contentData = await this.loadMultilingualContent();
    let recordsInserted = 0;

    for (const content of contentData) {
      try {
        await this.db.query(`
          INSERT INTO multilingual_content (
            content_key, content_type, content_en, content_bm, content_zh, content_ta,
            context_tags, medical_domain
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (content_key) DO UPDATE SET
            content_en = EXCLUDED.content_en,
            content_bm = EXCLUDED.content_bm,
            content_zh = EXCLUDED.content_zh,
            content_ta = EXCLUDED.content_ta
        `, [
          content.content_key,
          content.content_type,
          content.content_en,
          content.content_bm,
          content.content_zh,
          content.content_ta,
          content.context_tags,
          content.medical_domain
        ]);
        recordsInserted++;
      } catch (error) {
        console.warn(`    Warning: Failed to insert content ${content.content_key}:`, error.message);
      }
    }

    console.log(`✅ Multilingual content seeded: ${recordsInserted} records`);
  }

  /**
   * Load Malaysian medication data (sample data)
   */
  async loadMedicationData() {
    // In production, this would load from external data sources
    return [
      {
        medication_id: 'paracetamol-500mg',
        generic_name: 'Paracetamol',
        brand_names: ['Panadol', 'Febrifugine', 'Uphamol', 'Aeknil'],
        dosage_forms: ['tablet', 'suspension', 'suppository'],
        strengths: ['500mg', '250mg', '120mg/5ml'],
        therapeutic_class: 'Analgesic/Antipyretic',
        is_halal: true,
        halal_certification: 'JAKIM Certified',
        is_otc: true,
        prescription_required: false,
        availability_status: 'widely_available',
        manufacturer: 'Various',
        registration_number: 'MAL19926536A',
        cultural_notes: 'Widely accepted across all Malaysian communities. Safe during Ramadan fasting.',
        dietary_restrictions: []
      },
      {
        medication_id: 'metformin-500mg',
        generic_name: 'Metformin',
        brand_names: ['Glucophage', 'Diabemin', 'Glimet'],
        dosage_forms: ['tablet', 'extended_release_tablet'],
        strengths: ['500mg', '850mg', '1000mg'],
        therapeutic_class: 'Antidiabetic (Biguanide)',
        is_halal: true,
        halal_certification: 'JAKIM Certified',
        is_otc: false,
        prescription_required: true,
        availability_status: 'widely_available',
        manufacturer: 'Various',
        registration_number: 'MAL20010987A',
        cultural_notes: 'Important for diabetes management. Dosing may need adjustment during Ramadan.',
        dietary_restrictions: ['take_with_meals']
      },
      {
        medication_id: 'insulin-aspart',
        generic_name: 'Insulin Aspart',
        brand_names: ['NovoRapid', 'NovoLog'],
        dosage_forms: ['injection'],
        strengths: ['100IU/ml'],
        therapeutic_class: 'Rapid-acting Insulin',
        is_halal: true,
        halal_certification: 'Synthetic, Halal approved',
        is_otc: false,
        prescription_required: true,
        availability_status: 'hospital_pharmacy',
        manufacturer: 'Novo Nordisk',
        registration_number: 'MAL20004567B',
        cultural_notes: 'Critical for Type 1 diabetes. Special Ramadan dosing protocols available.',
        dietary_restrictions: ['injection_timing_critical']
      },
      {
        medication_id: 'amlodipine-5mg',
        generic_name: 'Amlodipine',
        brand_names: ['Norvasc', 'Amlocard', 'Amlodac'],
        dosage_forms: ['tablet'],
        strengths: ['2.5mg', '5mg', '10mg'],
        therapeutic_class: 'Calcium Channel Blocker',
        is_halal: true,
        halal_certification: 'JAKIM Certified',
        is_otc: false,
        prescription_required: true,
        availability_status: 'widely_available',
        manufacturer: 'Various',
        registration_number: 'MAL19998765C',
        cultural_notes: 'Common hypertension medication. Monitor during fasting periods.',
        dietary_restrictions: []
      },
      {
        medication_id: 'simvastatin-20mg',
        generic_name: 'Simvastatin',
        brand_names: ['Zocor', 'Simvacor', 'Simcard'],
        dosage_forms: ['tablet'],
        strengths: ['10mg', '20mg', '40mg'],
        therapeutic_class: 'HMG-CoA Reductase Inhibitor',
        is_halal: true,
        halal_certification: 'JAKIM Certified',
        is_otc: false,
        prescription_required: true,
        availability_status: 'widely_available',
        manufacturer: 'Various',
        registration_number: 'MAL20001234D',
        cultural_notes: 'Cholesterol medication. Usually taken at bedtime.',
        dietary_restrictions: ['take_at_bedtime', 'avoid_grapefruit']
      }
    ];
  }

  /**
   * Load multilingual content (sample data)
   */
  async loadMultilingualContent() {
    return [
      {
        content_key: 'medication_instruction_take_with_food',
        content_type: 'medication_instruction',
        content_en: 'Take with food or after meals',
        content_bm: 'Ambil bersama makanan atau selepas makan',
        content_zh: '与食物一起服用或餐后服用',
        content_ta: 'உணவுடன் அல்லது உணவுக்குப் பிறகு எடுத்துக்கொள்ளுங்கள்',
        context_tags: ['medication', 'instruction', 'dietary'],
        medical_domain: 'general'
      },
      {
        content_key: 'medication_instruction_take_on_empty_stomach',
        content_type: 'medication_instruction',
        content_en: 'Take on an empty stomach (1 hour before or 2 hours after meals)',
        content_bm: 'Ambil ketika perut kosong (1 jam sebelum atau 2 jam selepas makan)',
        content_zh: '空腹服用（餐前1小时或餐后2小时）',
        content_ta: 'வெறும் வயிற்றில் எடுத்துக்கொள்ளுங்கள் (உணவுக்கு 1 மணி நேரம் முன் அல்லது 2 மணி நேரம் பின்)',
        context_tags: ['medication', 'instruction', 'timing'],
        medical_domain: 'general'
      },
      {
        content_key: 'symptom_fever',
        content_type: 'symptom_description',
        content_en: 'Fever (elevated body temperature)',
        content_bm: 'Demam (suhu badan meningkat)',
        content_zh: '发烧（体温升高）',
        content_ta: 'காய்ச்சல் (உடல் வெப்பநிலை அதிகரிப்பு)',
        context_tags: ['symptom', 'common', 'temperature'],
        medical_domain: 'general'
      },
      {
        content_key: 'medication_reminder_prayer_time',
        content_type: 'medication_reminder',
        content_en: 'Time for your medication - after {prayer_name}',
        content_bm: 'Masa mengambil ubat - selepas {prayer_name}',
        content_zh: '服药时间 - {prayer_name}后',
        content_ta: 'மருந்து நேரம் - {prayer_name} பிறகு',
        context_tags: ['reminder', 'prayer', 'cultural'],
        medical_domain: 'medication_adherence'
      },
      {
        content_key: 'cultural_greeting_morning',
        content_type: 'cultural_greeting',
        content_en: 'Good morning! How are you feeling today?',
        content_bm: 'Selamat pagi! Apa khabar hari ini?',
        content_zh: '早上好！今天感觉如何？',
        content_ta: 'காலை வணக்கம்! இன்று எப்படி உணர்கிறீர்கள்?',
        context_tags: ['greeting', 'morning', 'wellness'],
        medical_domain: 'general'
      },
      {
        content_key: 'ramadan_medication_note',
        content_type: 'cultural_note',
        content_en: 'During Ramadan, medication timing may need adjustment. Please consult your doctor.',
        content_bm: 'Semasa Ramadan, masa mengambil ubat mungkin perlu diselaraskan. Sila rujuk doktor.',
        content_zh: '斋月期间，服药时间可能需要调整。请咨询医生。',
        content_ta: 'ரமலான் மாதத்தில், மருந்து நேரம் சரிசெய்ய வேண்டியிருக்கும். மருத்துவரிடம் ஆலோசியுங்கள்.',
        context_tags: ['ramadan', 'fasting', 'medication', 'cultural'],
        medical_domain: 'medication_adherence'
      }
    ];
  }

  /**
   * Run complete cultural data seeding
   */
  async seedAll() {
    console.log('🌟 Starting comprehensive Malaysian cultural data seeding...\n');
    
    const startTime = Date.now();
    
    try {
      await this.initialize();
      await this.seedPrayerTimes();
      await this.seedHolidays();
      await this.seedMalaysianMedications();
      await this.seedMultilingualContent();
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`\n🎉 Cultural data seeding completed successfully in ${duration.toFixed(2)} seconds`);
      
      // Generate summary report
      await this.generateSeedingReport();
      
    } catch (error) {
      console.error('\n❌ Cultural data seeding failed:', error.message);
      throw error;
    } finally {
      if (this.db) {
        await this.db.end();
      }
    }
  }

  /**
   * Generate seeding summary report
   */
  async generateSeedingReport() {
    console.log('\n📊 Generating seeding summary report...');
    
    try {
      const stats = await Promise.all([
        this.db.query('SELECT COUNT(*) as count FROM prayer_times'),
        this.db.query('SELECT COUNT(*) as count FROM malaysian_holidays'),
        this.db.query('SELECT COUNT(*) as count FROM malaysian_medications'),
        this.db.query('SELECT COUNT(*) as count FROM multilingual_content')
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        prayer_times_records: parseInt(stats[0].rows[0].count),
        holiday_records: parseInt(stats[1].rows[0].count),
        medication_records: parseInt(stats[2].rows[0].count),
        multilingual_content_records: parseInt(stats[3].rows[0].count)
      };

      console.log('\n📋 Seeding Summary Report:');
      console.log(`   Prayer Times: ${report.prayer_times_records} records`);
      console.log(`   Holidays: ${report.holiday_records} records`);
      console.log(`   Medications: ${report.medication_records} records`);
      console.log(`   Multilingual Content: ${report.multilingual_content_records} records`);
      
      // Save report to file
      await fs.writeFile(
        path.join(__dirname, '../../data/cultural-data-seeding-report.json'),
        JSON.stringify(report, null, 2)
      );
      
      console.log(`✅ Report saved to data/cultural-data-seeding-report.json`);
      
    } catch (error) {
      console.warn('Warning: Could not generate seeding report:', error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new CulturalDataSeeder();
  
  seeder.seedAll()
    .then(() => {
      console.log('\n✨ Malaysian cultural intelligence data is ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = CulturalDataSeeder;