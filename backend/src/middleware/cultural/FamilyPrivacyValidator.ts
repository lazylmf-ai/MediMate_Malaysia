/**
 * Malaysian Family Privacy Validation Middleware
 * Validates family privacy operations against Malaysian cultural norms and PDPA requirements
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param, query } from 'express-validator';
import { Logger } from 'winston';
import Container from 'typedi';
import { CulturalService } from '../../services/cultural/cultural.service';
import { PrivacyControlService } from '../../services/privacy/privacy-control.service';

export interface CulturalValidationContext {
  familyId: string;
  userId: string;
  relationship?: string;
  culturalRole?: string;
  action: string;
  resourceType?: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  culturalRecommendations?: string[];
}

/**
 * Malaysian cultural family hierarchy for privacy validation
 */
const FAMILY_HIERARCHY: Record<string, number> = {
  'family_head': 10,
  'grandparent': 9,
  'parent': 8,
  'elder_sibling': 7,
  'spouse': 6,
  'adult_child': 5,
  'younger_sibling': 4,
  'extended_family': 3,
  'in_law': 2,
  'other': 1
};

/**
 * Cultural privacy rules based on Malaysian family norms
 */
const CULTURAL_PRIVACY_RULES = {
  // Gender-based restrictions
  genderRestrictions: {
    'health_metrics': {
      restrictedCrossgender: true,
      exceptions: ['spouse', 'parent', 'healthcare_provider']
    },
    'medical_conditions': {
      restrictedCrossgender: true,
      exceptions: ['spouse', 'parent', 'healthcare_provider', 'emergency']
    }
  },

  // Age-based restrictions
  ageRestrictions: {
    elderRespect: {
      rule: 'Younger family members cannot access elder health data without permission',
      applies: ['health_metrics', 'medical_conditions', 'appointments'],
      exceptions: ['primary_caregiver', 'emergency']
    }
  },

  // Religious considerations
  religiousConsiderations: {
    islamic: {
      mahramRules: true, // Non-mahram restrictions
      prayerTimeRespect: true,
      ramadanConsiderations: true
    },
    buddhist: {
      karmaConsiderations: true,
      vegetarianMedications: true
    },
    hindu: {
      vegetarianMedications: true,
      ayurvedicPreferences: true
    }
  },

  // Malaysian cultural norms
  malaysianNorms: {
    collectiveDecisionMaking: true,
    extendedFamilyInclusion: true,
    faceConservation: true, // Preserving family dignity
    hierarchicalRespect: true
  }
};

/**
 * Validate privacy settings against Malaysian cultural norms
 */
export const validateCulturalPrivacy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logger = Container.get<Logger>('logger');
    const culturalService = Container.get(CulturalService);
    const privacyService = Container.get(PrivacyControlService);

    const context: CulturalValidationContext = {
      familyId: req.params.familyId || req.body.familyId,
      userId: req.user?.id || req.body.userId,
      relationship: req.body.relationship,
      culturalRole: req.body.culturalRole,
      action: req.method === 'GET' ? 'view' : req.body.action || 'update',
      resourceType: req.body.resourceType || req.params.resourceType
    };

    // Validate family relationship hierarchy
    const hierarchyValidation = validateHierarchy(context);
    if (!hierarchyValidation.valid) {
      return res.status(403).json({
        error: 'Cultural hierarchy violation',
        details: hierarchyValidation.errors,
        recommendations: hierarchyValidation.culturalRecommendations
      });
    }

    // Validate gender-based restrictions
    const genderValidation = await validateGenderRestrictions(context, culturalService);
    if (!genderValidation.valid) {
      return res.status(403).json({
        error: 'Cultural gender restriction violation',
        details: genderValidation.errors,
        recommendations: genderValidation.culturalRecommendations
      });
    }

    // Validate age-based restrictions
    const ageValidation = await validateAgeRestrictions(context, culturalService);
    if (!ageValidation.valid && !context.culturalRole?.includes('caregiver')) {
      return res.status(403).json({
        error: 'Cultural age restriction violation',
        details: ageValidation.errors,
        recommendations: ageValidation.culturalRecommendations
      });
    }

    // Validate religious considerations
    const religiousValidation = await validateReligiousConsiderations(context, culturalService);
    if (religiousValidation.warnings && religiousValidation.warnings.length > 0) {
      // Add warnings to response headers
      res.setHeader('X-Cultural-Warnings', JSON.stringify(religiousValidation.warnings));
    }

    // Validate PDPA compliance
    const pdpaValidation = await validatePDPACompliance(context, privacyService);
    if (!pdpaValidation.valid) {
      return res.status(403).json({
        error: 'PDPA compliance violation',
        details: pdpaValidation.errors
      });
    }

    // Add cultural context to request for downstream processing
    req.culturalValidation = {
      validated: true,
      hierarchyLevel: FAMILY_HIERARCHY[context.culturalRole || 'other'],
      culturalRestrictions: genderValidation.warnings || [],
      pdpaCompliant: pdpaValidation.valid
    };

    logger.info('Cultural privacy validation passed', { context });
    next();
  } catch (error) {
    const logger = Container.get<Logger>('logger');
    logger.error('Cultural privacy validation error', error);
    res.status(500).json({
      error: 'Cultural validation failed',
      message: 'An error occurred during cultural privacy validation'
    });
  }
};

/**
 * Validate family hierarchy rules
 */
function validateHierarchy(context: CulturalValidationContext): ValidationResponse {
  const response: ValidationResponse = { valid: true };

  const requestorLevel = FAMILY_HIERARCHY[context.culturalRole || 'other'];

  // Check if trying to access higher hierarchy member's data
  if (context.action === 'view' || context.action === 'edit') {
    // Special rules for sensitive data
    if (context.resourceType && ['medical_conditions', 'health_metrics'].includes(context.resourceType)) {
      if (requestorLevel < 6) { // Below spouse level
        response.valid = false;
        response.errors = ['Insufficient family hierarchy level to access sensitive health data'];
        response.culturalRecommendations = [
          'Request permission from family elder or primary caregiver',
          'Consider involving family head in healthcare decisions'
        ];
      }
    }
  }

  return response;
}

/**
 * Validate gender-based restrictions
 */
async function validateGenderRestrictions(
  context: CulturalValidationContext,
  culturalService: CulturalService
): Promise<ValidationResponse> {
  const response: ValidationResponse = { valid: true };

  if (!context.resourceType) return response;

  const restrictions = CULTURAL_PRIVACY_RULES.genderRestrictions[context.resourceType];
  if (restrictions && restrictions.restrictedCrossgender) {
    // Check if cross-gender access is attempted
    const userProfile = await culturalService.getUserCulturalProfile(context.userId);

    if (userProfile && userProfile.gender) {
      // Check if relationship is in exceptions
      const isException = restrictions.exceptions.some(exc =>
        context.relationship === exc || context.culturalRole === exc
      );

      if (!isException) {
        // Get target user's gender
        const targetProfile = await culturalService.getUserCulturalProfile(context.familyId);

        if (targetProfile && targetProfile.gender !== userProfile.gender) {
          response.valid = false;
          response.errors = ['Cross-gender access restricted for this health data category'];
          response.culturalRecommendations = [
            'Consider requesting access through same-gender family member',
            'Healthcare provider access may be more appropriate'
          ];
        }
      }
    }
  }

  return response;
}

/**
 * Validate age-based restrictions
 */
async function validateAgeRestrictions(
  context: CulturalValidationContext,
  culturalService: CulturalService
): Promise<ValidationResponse> {
  const response: ValidationResponse = { valid: true };

  const elderRespectRule = CULTURAL_PRIVACY_RULES.ageRestrictions.elderRespect;

  if (context.resourceType && elderRespectRule.applies.includes(context.resourceType)) {
    // Check if younger accessing elder's data
    const familyStructure = await culturalService.getFamilyStructure(context.familyId);

    if (familyStructure) {
      const isYoungerAccessingElder = familyStructure.relationships.some(rel =>
        rel.younger === context.userId &&
        rel.elder === context.familyId &&
        !elderRespectRule.exceptions.includes(context.culturalRole || '')
      );

      if (isYoungerAccessingElder) {
        response.valid = false;
        response.errors = [elderRespectRule.rule];
        response.culturalRecommendations = [
          'Seek permission from family elder directly',
          'Involve primary caregiver in access request'
        ];
      }
    }
  }

  return response;
}

/**
 * Validate religious considerations
 */
async function validateReligiousConsiderations(
  context: CulturalValidationContext,
  culturalService: CulturalService
): Promise<ValidationResponse> {
  const response: ValidationResponse = { valid: true, warnings: [] };

  const userProfile = await culturalService.getUserCulturalProfile(context.userId);

  if (userProfile && userProfile.religion) {
    const religiousRules = CULTURAL_PRIVACY_RULES.religiousConsiderations[userProfile.religion];

    if (religiousRules) {
      // Islamic mahram rules
      if (userProfile.religion === 'islamic' && religiousRules.mahramRules) {
        const familyRelations = await culturalService.getMahramRelations(context.familyId);
        if (!familyRelations.includes(context.userId)) {
          response.warnings?.push('Non-mahram family member access - ensure appropriate boundaries');
        }
      }

      // Prayer time considerations
      if (religiousRules.prayerTimeRespect) {
        const currentTime = new Date();
        const isPrayerTime = await culturalService.isPrayerTime(currentTime);
        if (isPrayerTime) {
          response.warnings?.push('Access during prayer time - consider delaying non-urgent requests');
        }
      }

      // Medication restrictions
      if (context.resourceType === 'medications') {
        if (religiousRules.vegetarianMedications) {
          response.warnings?.push('Check medication ingredients for religious compliance');
        }
      }
    }
  }

  return response;
}

/**
 * Validate PDPA compliance
 */
async function validatePDPACompliance(
  context: CulturalValidationContext,
  privacyService: PrivacyControlService
): Promise<ValidationResponse> {
  const response: ValidationResponse = { valid: true };

  try {
    // Check if user has valid consent for data access
    const consentCheck = await privacyService.checkDataAccessConsent(
      context.userId,
      context.familyId,
      context.resourceType || 'general'
    );

    if (!consentCheck.hasConsent) {
      response.valid = false;
      response.errors = [
        'No valid PDPA consent for data access',
        `Consent required for: ${consentCheck.missingPurposes?.join(', ')}`
      ];
    }

    // Check data retention period
    if (consentCheck.consentExpired) {
      response.valid = false;
      response.errors = ['PDPA consent has expired - renewal required'];
    }

    // Check purpose limitation
    if (context.action === 'share' && !consentCheck.sharingAllowed) {
      response.valid = false;
      response.errors = ['Data sharing not permitted under current PDPA consent'];
    }

  } catch (error) {
    response.valid = false;
    response.errors = ['Unable to verify PDPA compliance'];
  }

  return response;
}

/**
 * Validation rules for privacy settings updates
 */
export const privacySettingsValidationRules = () => [
  body('dataCategories').isArray().withMessage('Data categories must be an array'),
  body('dataCategories.*.category').isIn([
    'medications', 'adherence_history', 'health_metrics', 'emergency_contacts',
    'medical_conditions', 'allergies', 'appointments', 'insurance_details', 'cultural_preferences'
  ]).withMessage('Invalid data category'),
  body('dataCategories.*.visibility').isIn([
    'private', 'family_only', 'caregivers_only', 'healthcare_providers', 'public'
  ]).withMessage('Invalid visibility level'),
  body('familyMemberPermissions').optional().isArray(),
  body('culturalPreferences.respectElderHierarchy').optional().isBoolean(),
  body('culturalPreferences.collectiveDecisionMaking').optional().isBoolean(),
  body('pdpaConsent.purposes').optional().isArray(),
  body('pdpaConsent.dataRetentionPeriod').optional().isInt({ min: 1, max: 2555 })
    .withMessage('Data retention period must be between 1 and 2555 days')
];

/**
 * Validation rules for FHIR sharing settings
 */
export const fhirSharingValidationRules = () => [
  body('providerId').notEmpty().withMessage('Provider ID is required'),
  body('providerId').isIn(['MOH', 'KPJ', 'IHH', 'SUNWAY', 'CUSTOM'])
    .withMessage('Invalid healthcare provider'),
  body('sharingLevel').isIn(['emergency_only', 'basic', 'full'])
    .withMessage('Invalid sharing level'),
  body('consentGiven').isBoolean().withMessage('Consent status must be boolean'),
  body('validUntil').optional().isISO8601().withMessage('Valid until must be a valid date')
];

/**
 * Handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      culturalNote: 'Please ensure compliance with Malaysian family privacy norms'
    });
  }

  next();
};

/**
 * Middleware to check family member permission
 */
export const checkFamilyMemberPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const privacyService = Container.get(PrivacyControlService);

      const hasPermission = await privacyService.checkFamilyMemberPermission(
        req.user?.id || '',
        req.params.familyId,
        requiredPermission
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient family permissions',
          required: requiredPermission,
          culturalNote: 'Consider requesting permission from family elder or primary caregiver'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: 'Permission check failed'
      });
    }
  };
};

// Extend Express Request interface for cultural validation
declare global {
  namespace Express {
    interface Request {
      culturalValidation?: {
        validated: boolean;
        hierarchyLevel: number;
        culturalRestrictions: string[];
        pdpaCompliant: boolean;
      };
    }
  }
}

export default {
  validateCulturalPrivacy,
  privacySettingsValidationRules,
  fhirSharingValidationRules,
  handleValidationErrors,
  checkFamilyMemberPermission
};