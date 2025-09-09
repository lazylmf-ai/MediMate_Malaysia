/**
 * Malaysian IC Validation Module
 * 
 * Provides comprehensive validation and demographic extraction for Malaysian IC numbers
 * with healthcare-specific enhancements and cultural intelligence integration.
 */

export {
    validateMalaysianIC,
    extractDemographics,
    formatICNumber,
    compareICNumbers,
    hashICNumber,
    validateMultipleICs,
    isLikelyHealthcareProfessional,
    MALAYSIAN_STATE_CODES,
    validateICFormat
} from './icValidator';

export {
    ICValidationError,
    ICValidationResult,
    MalaysianState,
    ICDemographicData,
    ICValidationOptions,
    ICDemographicFilter,
    ICValidationErrorCode,
    ICStatistics,
    ICBatchValidationResult
} from './types';

export { default } from './icValidator';