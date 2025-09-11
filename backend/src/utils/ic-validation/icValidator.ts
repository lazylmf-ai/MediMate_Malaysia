/**
 * Malaysian IC (Identity Card) Validation Utilities
 * 
 * Validates Malaysian IC numbers and extracts demographic information
 * according to the official Malaysian IC format standards.
 * 
 * IC Format: YYMMDD-PB-###G
 * - YY: Year of birth (2-digit)
 * - MM: Month of birth (01-12)
 * - DD: Day of birth (01-31)
 * - PB: Place of birth code (Malaysian state codes)
 * - ###: Serial number (001-999)
 * - G: Gender digit (odd=male, even=female)
 */

import { ICValidationResult, ICDemographicData, MalaysianState, ICValidationError } from './types';

/**
 * Malaysian state codes mapping for place of birth
 */
export const MALAYSIAN_STATE_CODES: Record<string, MalaysianState> = {
    // Peninsular Malaysia
    '01': { code: '01', name: 'Johor', region: 'Peninsular' },
    '02': { code: '02', name: 'Kedah', region: 'Peninsular' },
    '03': { code: '03', name: 'Kelantan', region: 'Peninsular' },
    '04': { code: '04', name: 'Malacca', region: 'Peninsular' },
    '05': { code: '05', name: 'Negeri Sembilan', region: 'Peninsular' },
    '06': { code: '06', name: 'Pahang', region: 'Peninsular' },
    '07': { code: '07', name: 'Pinang', region: 'Peninsular' },
    '08': { code: '08', name: 'Perak', region: 'Peninsular' },
    '09': { code: '09', name: 'Perlis', region: 'Peninsular' },
    '10': { code: '10', name: 'Selangor', region: 'Peninsular' },
    '11': { code: '11', name: 'Terengganu', region: 'Peninsular' },
    '12': { code: '12', name: 'Kuala Lumpur', region: 'Peninsular' },
    '13': { code: '13', name: 'Labuan', region: 'Federal Territory' },
    '14': { code: '14', name: 'Putrajaya', region: 'Federal Territory' },
    
    // Sabah
    '21': { code: '21', name: 'Johor', region: 'Sabah' },
    '22': { code: '22', name: 'Johor', region: 'Sabah' },
    '23': { code: '23', name: 'Johor', region: 'Sabah' },
    '24': { code: '24', name: 'Johor', region: 'Sabah' },
    '25': { code: '25', name: 'Kudat', region: 'Sabah' },
    '26': { code: '26', name: 'Lahad Datu', region: 'Sabah' },
    '27': { code: '27', name: 'Sandakan', region: 'Sabah' },
    '28': { code: '28', name: 'Tawau', region: 'Sabah' },
    '29': { code: '29', name: 'Keningau', region: 'Sabah' },
    
    // Sarawak
    '31': { code: '31', name: 'Kuching', region: 'Sarawak' },
    '32': { code: '32', name: 'Sri Aman', region: 'Sarawak' },
    '33': { code: '33', name: 'Sibu', region: 'Sarawak' },
    '34': { code: '34', name: 'Miri', region: 'Sarawak' },
    '35': { code: '35', name: 'Limbang', region: 'Sarawak' },
    '36': { code: '36', name: 'Sarikei', region: 'Sarawak' },
    '37': { code: '37', name: 'Kapit', region: 'Sarawak' },
    '38': { code: '38', name: 'Samarahan', region: 'Sarawak' },
    '39': { code: '39', name: 'Bintulu', region: 'Sarawak' },
    
    // Special codes
    '40': { code: '40', name: 'Brunei', region: 'Foreign' },
    '41': { code: '41', name: 'Indonesia', region: 'Foreign' },
    '42': { code: '42', name: 'Cambodia', region: 'Foreign' },
    '43': { code: '43', name: 'Laos', region: 'Foreign' },
    '44': { code: '44', name: 'Myanmar', region: 'Foreign' },
    '45': { code: '45', name: 'Philippines', region: 'Foreign' },
    '46': { code: '46', name: 'Singapore', region: 'Foreign' },
    '47': { code: '47', name: 'Thailand', region: 'Foreign' },
    '48': { code: '48', name: 'Vietnam', region: 'Foreign' },
    '49': { code: '49', name: 'China', region: 'Foreign' },
    
    // Non-citizen codes
    '71': { code: '71', name: 'Malaysian Consulate in Thailand', region: 'Consulate' },
    '72': { code: '72', name: 'Malaysian Consulate in Singapore', region: 'Consulate' },
    '74': { code: '74', name: 'Malaysian Consulate in Philippines', region: 'Consulate' },
    '75': { code: '75', name: 'Malaysian Consulate in Indonesia', region: 'Consulate' },
    '76': { code: '76', name: 'Malaysian Consulate in India', region: 'Consulate' },
    '77': { code: '77', name: 'Malaysian Consulate in China', region: 'Consulate' },
    '78': { code: '78', name: 'Malaysian Consulate in Myanmar', region: 'Consulate' },
    '79': { code: '79', name: 'Malaysian Consulate in Japan', region: 'Consulate' },
    
    // Unknown/Invalid
    '82': { code: '82', name: 'Unknown', region: 'Unknown' },
    '86': { code: '86', name: 'Unknown', region: 'Unknown' },
    '87': { code: '87', name: 'Unknown', region: 'Unknown' }
};

/**
 * Validates the basic format of a Malaysian IC number
 */
export function validateICFormat(icNumber: string): ICValidationError[] {
    const errors: ICValidationError[] = [];
    
    // Remove any dashes or spaces and convert to string
    const cleanIC = icNumber.toString().replace(/[-\s]/g, '');
    
    // Check length
    if (cleanIC.length !== 12) {
        errors.push({
            code: 'INVALID_LENGTH',
            message: `IC number must be 12 digits long, got ${cleanIC.length}`,
            field: 'ic_number'
        });
        return errors;
    }
    
    // Check if all characters are digits
    if (!/^\d{12}$/.test(cleanIC)) {
        errors.push({
            code: 'INVALID_FORMAT',
            message: 'IC number must contain only digits',
            field: 'ic_number'
        });
        return errors;
    }
    
    // Validate date components
    const year = parseInt(cleanIC.substring(0, 2));
    const month = parseInt(cleanIC.substring(2, 4));
    const day = parseInt(cleanIC.substring(4, 6));
    
    // Validate month
    if (month < 1 || month > 12) {
        errors.push({
            code: 'INVALID_MONTH',
            message: `Invalid month: ${month}. Must be between 01 and 12`,
            field: 'birth_month'
        });
    }
    
    // Validate day
    if (day < 1 || day > 31) {
        errors.push({
            code: 'INVALID_DAY',
            message: `Invalid day: ${day}. Must be between 01 and 31`,
            field: 'birth_day'
        });
    }
    
    // Validate place of birth
    const placeCode = cleanIC.substring(6, 8);
    if (!MALAYSIAN_STATE_CODES[placeCode]) {
        errors.push({
            code: 'INVALID_PLACE_CODE',
            message: `Invalid place of birth code: ${placeCode}`,
            field: 'place_of_birth'
        });
    }
    
    // Validate serial number (cannot be 000)
    const serialNumber = cleanIC.substring(8, 11);
    if (serialNumber === '000') {
        errors.push({
            code: 'INVALID_SERIAL',
            message: 'Serial number cannot be 000',
            field: 'serial_number'
        });
    }
    
    return errors;
}

/**
 * Validates a complete Malaysian IC number with date validation
 */
export function validateMalaysianIC(icNumber: string): ICValidationResult {
    const cleanIC = icNumber.toString().replace(/[-\s]/g, '');
    
    // Basic format validation
    const formatErrors = validateICFormat(cleanIC);
    if (formatErrors.length > 0) {
        return {
            isValid: false,
            errors: formatErrors,
            icNumber: cleanIC
        };
    }
    
    const errors: ICValidationError[] = [];
    
    // Extract date components
    const year = parseInt(cleanIC.substring(0, 2));
    const month = parseInt(cleanIC.substring(2, 4));
    const day = parseInt(cleanIC.substring(4, 6));
    
    // Determine full year (assuming IC format started in 1900)
    // People born before 2000 will have years 00-99 representing 2000-2099
    // People born in 1900-1999 will have years 00-99 representing 1900-1999
    // We use a cutoff year to determine which century
    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 2000 + 30; // Assume people older than 30 were born in 1900s
    const fullYear = year <= cutoffYear ? 2000 + year : 1900 + year;
    
    // Validate the actual date
    const birthDate = new Date(fullYear, month - 1, day);
    if (birthDate.getFullYear() !== fullYear || 
        birthDate.getMonth() !== month - 1 || 
        birthDate.getDate() !== day) {
        errors.push({
            code: 'INVALID_DATE',
            message: `Invalid birth date: ${day}/${month}/${fullYear}`,
            field: 'birth_date'
        });
    }
    
    // Check if birth date is not in the future
    if (birthDate > new Date()) {
        errors.push({
            code: 'FUTURE_DATE',
            message: 'Birth date cannot be in the future',
            field: 'birth_date'
        });
    }
    
    // Check reasonable age limits (not older than 120 years)
    const age = currentYear - fullYear;
    if (age > 120) {
        errors.push({
            code: 'UNREASONABLE_AGE',
            message: `Unreasonable age: ${age} years`,
            field: 'birth_date'
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        icNumber: cleanIC,
        demographics: errors.length === 0 ? extractDemographics(cleanIC) : undefined
    };
}

/**
 * Extracts demographic information from a valid Malaysian IC number
 */
export function extractDemographics(icNumber: string): ICDemographicData {
    const cleanIC = icNumber.toString().replace(/[-\s]/g, '');
    
    // Extract components
    const year = parseInt(cleanIC.substring(0, 2));
    const month = parseInt(cleanIC.substring(2, 4));
    const day = parseInt(cleanIC.substring(4, 6));
    const placeCode = cleanIC.substring(6, 8);
    const serialNumber = cleanIC.substring(8, 11);
    const genderDigit = parseInt(cleanIC.substring(11, 12));
    
    // Determine full year
    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 2000 + 30;
    const fullYear = year <= cutoffYear ? 2000 + year : 1900 + year;
    
    // Calculate age
    const birthDate = new Date(fullYear, month - 1, day);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Determine gender
    const gender = genderDigit % 2 === 0 ? 'F' : 'M';
    
    // Get place of birth information
    const placeOfBirth = MALAYSIAN_STATE_CODES[placeCode] || {
        code: placeCode,
        name: 'Unknown',
        region: 'Unknown'
    };
    
    // Determine citizenship status based on place code
    let citizenshipStatus: 'citizen' | 'permanent_resident' | 'foreigner';
    if (placeOfBirth.region === 'Foreign' || placeOfBirth.region === 'Consulate') {
        citizenshipStatus = 'foreigner';
    } else if (placeOfBirth.region === 'Unknown') {
        citizenshipStatus = 'permanent_resident';
    } else {
        citizenshipStatus = 'citizen';
    }
    
    return {
        icNumber: cleanIC,
        formattedICNumber: `${cleanIC.substring(0, 6)}-${cleanIC.substring(6, 8)}-${cleanIC.substring(8)}`,
        
        // Birth information
        birthDate,
        birthYear: fullYear,
        birthMonth: month,
        birthDay: day,
        age,
        
        // Gender
        gender,
        genderDigit,
        
        // Place of birth
        placeOfBirthCode: placeCode,
        placeOfBirth: placeOfBirth.name,
        placeOfBirthRegion: placeOfBirth.region,
        state: placeOfBirth.name,
        
        // Serial and citizenship
        serialNumber,
        citizenshipStatus,
        
        // Additional computed fields
        isAdult: age >= 18,
        isSenior: age >= 60,
        zodiacSign: getChineseZodiac(fullYear),
        
        // Cultural information
        estimatedEthnicity: estimateEthnicity(placeOfBirth, serialNumber),
        likelyLanguages: getLikelyLanguages(placeOfBirth),
        
        // Validation metadata
        extractedAt: new Date(),
        validationVersion: '1.0'
    };
}

/**
 * Estimates likely ethnicity based on place of birth and patterns
 * This is statistical estimation only and should not be used for official purposes
 */
function estimateEthnicity(placeOfBirth: MalaysianState, serialNumber: string): string[] {
    const ethnicities: string[] = [];
    
    // This is a simplified estimation based on demographic patterns
    // In real applications, this should be based on more sophisticated models
    
    if (placeOfBirth.region === 'Sarawak') {
        ethnicities.push('Dayak', 'Chinese', 'Malay', 'Iban');
    } else if (placeOfBirth.region === 'Sabah') {
        ethnicities.push('Kadazan-Dusun', 'Chinese', 'Malay', 'Bajau');
    } else if (placeOfBirth.name === 'Pinang' || placeOfBirth.name === 'Kuala Lumpur') {
        ethnicities.push('Chinese', 'Indian', 'Malay');
    } else if (placeOfBirth.region === 'Peninsular') {
        ethnicities.push('Malay', 'Chinese', 'Indian');
    } else if (placeOfBirth.region === 'Foreign') {
        ethnicities.push('Foreign');
    }
    
    // Default fallback
    if (ethnicities.length === 0) {
        ethnicities.push('Malaysian');
    }
    
    return ethnicities;
}

/**
 * Determines likely languages based on place of birth
 */
function getLikelyLanguages(placeOfBirth: MalaysianState): string[] {
    const languages = ['ms']; // Bahasa Malaysia is universal
    
    if (placeOfBirth.region === 'Sarawak') {
        languages.push('en', 'zh', 'dayak');
    } else if (placeOfBirth.region === 'Sabah') {
        languages.push('en', 'zh', 'kadazan');
    } else if (placeOfBirth.name === 'Pinang' || placeOfBirth.name === 'Kuala Lumpur') {
        languages.push('en', 'zh', 'ta');
    } else if (placeOfBirth.region === 'Peninsular') {
        languages.push('en', 'zh', 'ta');
    }
    
    return languages;
}

/**
 * Gets Chinese zodiac animal for a given year
 */
function getChineseZodiac(year: number): string {
    const animals = [
        'Monkey', 'Rooster', 'Dog', 'Pig', 'Rat', 'Ox',
        'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat'
    ];
    return animals[year % 12];
}

/**
 * Formats IC number for display with dashes
 */
export function formatICNumber(icNumber: string): string {
    const cleanIC = icNumber.toString().replace(/[-\s]/g, '');
    if (cleanIC.length !== 12) {
        return icNumber; // Return original if invalid
    }
    return `${cleanIC.substring(0, 6)}-${cleanIC.substring(6, 8)}-${cleanIC.substring(8)}`;
}

/**
 * Checks if two IC numbers are the same
 */
export function compareICNumbers(ic1: string, ic2: string): boolean {
    const clean1 = ic1.toString().replace(/[-\s]/g, '');
    const clean2 = ic2.toString().replace(/[-\s]/g, '');
    return clean1 === clean2;
}

/**
 * Generates IC number hash for privacy
 */
export async function hashICNumber(icNumber: string): Promise<string> {
    const crypto = require('crypto');
    const cleanIC = icNumber.toString().replace(/[-\s]/g, '');
    return crypto.createHash('sha256').update(cleanIC).digest('hex');
}

/**
 * Validates multiple IC numbers
 */
export function validateMultipleICs(icNumbers: string[]): { [key: string]: ICValidationResult } {
    const results: { [key: string]: ICValidationResult } = {};
    
    for (const ic of icNumbers) {
        results[ic] = validateMalaysianIC(ic);
    }
    
    return results;
}

/**
 * Checks if IC belongs to a healthcare professional based on demographic patterns
 */
export function isLikelyHealthcareProfessional(demographics: ICDemographicData): boolean {
    // This is a heuristic check based on age and education patterns
    // In real applications, this should be verified against professional registrations
    
    const { age, citizenshipStatus } = demographics;
    
    // Healthcare professionals typically need to be:
    // - Adults (at least 25 for most qualifications)
    // - Citizens or permanent residents
    // - Not too old to practice (usually retire by 65-70)
    
    return age >= 25 && age <= 70 && 
           (citizenshipStatus === 'citizen' || citizenshipStatus === 'permanent_resident');
}

export default {
    validateMalaysianIC,
    extractDemographics,
    formatICNumber,
    compareICNumbers,
    hashICNumber,
    validateMultipleICs,
    isLikelyHealthcareProfessional,
    MALAYSIAN_STATE_CODES
};