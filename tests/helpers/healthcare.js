/**
 * Healthcare Test Helpers for MediMate Malaysia
 * PDPA compliant test utilities for Malaysian healthcare scenarios
 * Provides mock data and validation helpers
 */

const crypto = require('crypto');

/**
 * Malaysian Healthcare Test Data Factory
 */
class MalaysianHealthcareTestFactory {
  /**
   * Generate mock Malaysian IC number
   * @param {Object} options - Generation options
   * @returns {string} Valid Malaysian IC number
   */
  static generateMalaysianIC(options = {}) {
    const {
      state = 'KUL', // Default to Kuala Lumpur
      birthYear = 1990,
      gender = 'male'
    } = options;

    // State code mapping
    const stateCodes = {
      'JHR': ['01', '21', '22', '23', '24'],
      'KDH': ['02', '25', '26', '27'],
      'KTN': ['03', '28', '29'],
      'MLK': ['04', '30'],
      'NSN': ['05', '31', '59'],
      'PHG': ['06', '32', '33'],
      'PNG': ['07', '34', '35'],
      'PRK': ['08', '36', '37', '38', '39'],
      'PLS': ['09', '40'],
      'SGR': ['10', '41', '42', '43', '44'],
      'TRG': ['11', '45', '46'],
      'SBH': ['12', '47', '48', '49'],
      'SWK': ['13', '50', '51', '52', '53'],
      'KUL': ['14', '54', '55', '56', '57']
    };

    // Generate birth date (YYMMDD)
    const year = birthYear.toString().slice(-2);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const birthDate = `${year}${month}${day}`;

    // Select random state code
    const codes = stateCodes[state] || stateCodes['KUL'];
    const stateCode = codes[Math.floor(Math.random() * codes.length)];

    // Generate last 2 digits (odd for male, even for female)
    const lastDigit = gender === 'male' ? 
      Math.floor(Math.random() * 5) * 2 + 1 : 
      Math.floor(Math.random() * 5) * 2;
    const lastTwo = `0${lastDigit}`.slice(-2);

    return `${birthDate}-${stateCode}-${lastTwo}`;
  }

  /**
   * Generate mock patient data (PDPA compliant - test data only)
   * @param {Object} options - Patient generation options
   * @returns {Object} Mock patient object
   */
  static generatePatient(options = {}) {
    const {
      state = 'KUL',
      age = 35,
      culturalBackground = 'malay'
    } = options;

    const birthYear = new Date().getFullYear() - age;
    const ic = this.generateMalaysianIC({ state, birthYear });

    const culturalNames = {
      malay: {
        male: ['Ahmad', 'Muhammad', 'Abdul Rahman', 'Mohd Faiz', 'Zulkifli'],
        female: ['Siti', 'Nur Aishah', 'Fatimah', 'Noraini', 'Zarina']
      },
      chinese: {
        male: ['Wei Ming', 'Jun Hao', 'Li Wei', 'Cheng Wei', 'Kai Ming'],
        female: ['Li Mei', 'Wei Ling', 'Xin Yi', 'Hui Min', 'Jia Wei']
      },
      indian: {
        male: ['Raj Kumar', 'Suresh', 'Vijay', 'Arun', 'Dinesh'],
        female: ['Priya', 'Kavitha', 'Meera', 'Sushma', 'Deepa']
      }
    };

    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const names = culturalNames[culturalBackground] || culturalNames.malay;
    const name = names[gender][Math.floor(Math.random() * names[gender].length)];

    return {
      id: `test-patient-${crypto.randomUUID()}`,
      ic_number: ic,
      name: name,
      age: age,
      gender: gender,
      cultural_background: culturalBackground,
      state: state,
      preferred_language: this.getCulturalLanguage(culturalBackground),
      created_at: new Date().toISOString(),
      is_test_data: true, // IMPORTANT: Mark as test data for PDPA compliance
      pdpa_consent: true,
      data_classification: 'test_restricted'
    };
  }

  /**
   * Get preferred language based on cultural background
   * @param {string} culturalBackground 
   * @returns {string} Language code
   */
  static getCulturalLanguage(culturalBackground) {
    const languageMap = {
      malay: 'ms',
      chinese: 'zh',
      indian: 'ta',
      other: 'en'
    };
    return languageMap[culturalBackground] || 'en';
  }

  /**
   * Generate mock medication data with Malaysian brands
   * @param {Object} options - Medication options
   * @returns {Object} Mock medication object
   */
  static generateMedication(options = {}) {
    const {
      isHalal = true,
      availability = 'widely_available'
    } = options;

    const medications = [
      {
        generic_name: 'Paracetamol',
        brand_names: ['Panadol', 'Febrifugine', 'Uphamol'],
        dosage_forms: ['tablet', 'suspension'],
        strengths: ['500mg', '250mg']
      },
      {
        generic_name: 'Metformin',
        brand_names: ['Glucophage', 'Diabemin'],
        dosage_forms: ['tablet'],
        strengths: ['500mg', '850mg']
      },
      {
        generic_name: 'Amlodipine',
        brand_names: ['Norvasc', 'Amlocard'],
        dosage_forms: ['tablet'],
        strengths: ['5mg', '10mg']
      }
    ];

    const med = medications[Math.floor(Math.random() * medications.length)];

    return {
      id: `test-med-${crypto.randomUUID()}`,
      medication_id: `${med.generic_name.toLowerCase()}-${med.strengths[0]}`,
      generic_name: med.generic_name,
      brand_names: med.brand_names,
      dosage_forms: med.dosage_forms,
      strengths: med.strengths,
      is_halal: isHalal,
      halal_certification: isHalal ? 'JAKIM Certified' : null,
      availability_status: availability,
      is_test_data: true, // Mark as test data
      cultural_notes: this.generateCulturalMedicationNotes(med.generic_name),
      created_at: new Date().toISOString()
    };
  }

  /**
   * Generate cultural notes for medication
   * @param {string} medicationName 
   * @returns {string} Cultural notes
   */
  static generateCulturalMedicationNotes(medicationName) {
    const notes = {
      'Paracetamol': 'Safe during Ramadan fasting. Widely accepted across all Malaysian communities.',
      'Metformin': 'Diabetes medication. Timing adjustment needed during Ramadan.',
      'Amlodipine': 'Blood pressure medication. Monitor during fasting periods.'
    };
    return notes[medicationName] || 'Standard Malaysian healthcare guidelines apply.';
  }

  /**
   * Generate mock healthcare appointment
   * @param {Object} options - Appointment options
   * @returns {Object} Mock appointment object
   */
  static generateAppointment(options = {}) {
    const {
      patientId = 'test-patient-123',
      culturalConsiderations = true
    } = options;

    const appointmentTypes = [
      'General Consultation',
      'Follow-up',
      'Medication Review',
      'Health Screening',
      'Specialist Referral'
    ];

    const facilities = [
      { name: 'Klinik Kesihatan Shah Alam', type: 'clinic', state: 'SGR' },
      { name: 'Hospital Kuala Lumpur', type: 'hospital', state: 'KUL' },
      { name: 'Poliklinik Johor Bahru', type: 'polyclinic', state: 'JHR' }
    ];

    const facility = facilities[Math.floor(Math.random() * facilities.length)];
    const appointmentType = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)];

    // Generate appointment time avoiding prayer times if cultural considerations enabled
    let appointmentTime = new Date();
    appointmentTime.setDate(appointmentTime.getDate() + Math.floor(Math.random() * 30));
    appointmentTime.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0); // 9 AM to 5 PM

    if (culturalConsiderations) {
      // Avoid Friday 12-2 PM (Jummah prayer)
      if (appointmentTime.getDay() === 5) { // Friday
        const hour = appointmentTime.getHours();
        if (hour >= 12 && hour < 14) {
          appointmentTime.setHours(14, 30); // Move to 2:30 PM
        }
      }
    }

    return {
      id: `test-appt-${crypto.randomUUID()}`,
      patient_id: patientId,
      appointment_type: appointmentType,
      facility: facility,
      scheduled_time: appointmentTime.toISOString(),
      cultural_considerations: culturalConsiderations,
      prayer_time_aware: culturalConsiderations,
      is_test_data: true,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Generate mock healthcare provider
   * @param {Object} options - Provider options
   * @returns {Object} Mock provider object
   */
  static generateHealthcareProvider(options = {}) {
    const {
      state = 'KUL',
      type = 'clinic'
    } = options;

    const providerTypes = {
      clinic: 'Klinik',
      hospital: 'Hospital',
      pharmacy: 'Farmasi',
      lab: 'Makmal'
    };

    const stateNames = {
      'KUL': 'Kuala Lumpur',
      'SGR': 'Selangor',
      'JHR': 'Johor',
      'PNG': 'Penang'
    };

    return {
      id: `test-provider-${crypto.randomUUID()}`,
      name: `${providerTypes[type]} ${stateNames[state]} ${Math.floor(Math.random() * 100)}`,
      type: type,
      state: state,
      cultural_services: true,
      multilingual_support: ['ms', 'en', 'zh', 'ta'],
      islamic_friendly: true,
      halal_certified_medications: type === 'pharmacy',
      prayer_room_available: type === 'hospital' || type === 'clinic',
      is_test_data: true,
      created_at: new Date().toISOString()
    };
  }
}

/**
 * Healthcare Validation Helpers
 */
class HealthcareValidationHelpers {
  /**
   * Validate Malaysian IC number format
   * @param {string} ic - IC number to validate
   * @returns {Object} Validation result
   */
  static validateMalaysianIC(ic) {
    const icRegex = /^[0-9]{6}-?[0-9]{2}-?[0-9]{4}$/;
    const cleanIC = ic.replace(/-/g, '');
    
    if (!icRegex.test(ic)) {
      return { isValid: false, error: 'Invalid IC format' };
    }

    // Validate birth date
    const year = parseInt(cleanIC.substr(0, 2));
    const month = parseInt(cleanIC.substr(2, 2));
    const day = parseInt(cleanIC.substr(4, 2));
    
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { isValid: false, error: 'Invalid birth date in IC' };
    }

    return { isValid: true, birthYear: year <= 23 ? 2000 + year : 1900 + year };
  }

  /**
   * Validate PDPA compliance for test data
   * @param {Object} data - Data to validate
   * @returns {Object} Compliance result
   */
  static validatePDPACompliance(data) {
    const requiredFields = ['is_test_data', 'created_at'];
    const missing = requiredFields.filter(field => !(field in data));
    
    if (missing.length > 0) {
      return { isCompliant: false, missing };
    }

    if (!data.is_test_data) {
      return { isCompliant: false, error: 'Real patient data not allowed in tests' };
    }

    return { isCompliant: true };
  }

  /**
   * Validate healthcare data classification
   * @param {Object} data - Healthcare data
   * @returns {Object} Classification validation
   */
  static validateHealthcareDataClassification(data) {
    const allowedClassifications = [
      'public',
      'internal', 
      'test_confidential',
      'test_restricted'
    ];

    if (data.data_classification && !allowedClassifications.includes(data.data_classification)) {
      return { isValid: false, error: 'Invalid data classification for tests' };
    }

    // Test data should not use production classifications
    if (data.is_test_data && ['confidential', 'restricted', 'top_secret'].includes(data.data_classification)) {
      return { isValid: false, error: 'Test data cannot use production security classifications' };
    }

    return { isValid: true };
  }
}

/**
 * Malaysian Cultural Test Helpers
 */
class CulturalTestHelpers {
  /**
   * Generate mock prayer times for testing
   * @param {string} city - City key
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} Mock prayer times
   */
  static generateMockPrayerTimes(city = 'kuala-lumpur', date = '2024-01-01') {
    const baseTimes = {
      fajr: '06:00',
      sunrise: '07:15',
      dhuhr: '13:15',
      asr: '16:45',
      maghrib: '19:30',
      isha: '20:45'
    };

    return {
      city: city,
      date: date,
      prayers: baseTimes,
      timezone: 'Asia/Kuala_Lumpur',
      calculation_method: 'JAKIM',
      is_test_data: true
    };
  }

  /**
   * Generate mock Malaysian holiday
   * @param {Object} options - Holiday options
   * @returns {Object} Mock holiday
   */
  static generateMockHoliday(options = {}) {
    const {
      type = 'federal',
      culturalSignificance = 'Malaysian national celebration'
    } = options;

    return {
      id: `test-holiday-${crypto.randomUUID()}`,
      name: 'Test Malaysian Holiday',
      name_bm: 'Hari Perayaan Malaysia Ujian',
      name_zh: '测试马来西亚节日',
      name_ta: 'சோதனை மலேசிய விடுமுறை',
      date: '2024-08-31',
      type: type,
      cultural_significance: culturalSignificance,
      healthcare_impact: 'medium',
      is_test_data: true
    };
  }
}

// Export all helpers
module.exports = {
  MalaysianHealthcareTestFactory,
  HealthcareValidationHelpers,
  CulturalTestHelpers
};