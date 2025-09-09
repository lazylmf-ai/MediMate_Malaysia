/**
 * Type definitions for Malaysian IC validation and demographic extraction
 */

export interface ICValidationError {
    code: string;
    message: string;
    field: string;
}

export interface ICValidationResult {
    isValid: boolean;
    errors: ICValidationError[];
    icNumber: string;
    demographics?: ICDemographicData;
}

export interface MalaysianState {
    code: string;
    name: string;
    region: 'Peninsular' | 'Sabah' | 'Sarawak' | 'Federal Territory' | 'Foreign' | 'Consulate' | 'Unknown';
}

export interface ICDemographicData {
    // IC Information
    icNumber: string;
    formattedICNumber: string;
    
    // Birth Information
    birthDate: Date;
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    age: number;
    
    // Gender
    gender: 'M' | 'F';
    genderDigit: number;
    
    // Place of Birth
    placeOfBirthCode: string;
    placeOfBirth: string;
    placeOfBirthRegion: string;
    state: string;
    
    // Serial and Citizenship
    serialNumber: string;
    citizenshipStatus: 'citizen' | 'permanent_resident' | 'foreigner';
    
    // Computed Information
    isAdult: boolean;
    isSenior: boolean;
    zodiacSign: string;
    
    // Cultural Information (statistical estimates)
    estimatedEthnicity: string[];
    likelyLanguages: string[];
    
    // Metadata
    extractedAt: Date;
    validationVersion: string;
}

export interface ICValidationOptions {
    strictDateValidation?: boolean;
    allowFutureDate?: boolean;
    maxAge?: number;
    minAge?: number;
}

export interface ICDemographicFilter {
    ageMin?: number;
    ageMax?: number;
    gender?: 'M' | 'F';
    citizenshipStatus?: 'citizen' | 'permanent_resident' | 'foreigner';
    region?: string;
    state?: string;
}

export type ICValidationErrorCode = 
    | 'INVALID_LENGTH'
    | 'INVALID_FORMAT'
    | 'INVALID_MONTH'
    | 'INVALID_DAY'
    | 'INVALID_PLACE_CODE'
    | 'INVALID_SERIAL'
    | 'INVALID_DATE'
    | 'FUTURE_DATE'
    | 'UNREASONABLE_AGE'
    | 'INVALID_CHECKSUM';

export interface ICStatistics {
    totalValidated: number;
    validCount: number;
    invalidCount: number;
    errorDistribution: Record<ICValidationErrorCode, number>;
    demographicBreakdown: {
        genderDistribution: { M: number; F: number };
        ageGroups: Record<string, number>;
        regionDistribution: Record<string, number>;
        citizenshipDistribution: Record<string, number>;
    };
}

export interface ICBatchValidationResult {
    results: { [icNumber: string]: ICValidationResult };
    statistics: ICStatistics;
    processedAt: Date;
}