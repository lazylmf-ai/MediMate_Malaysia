/**
 * Healthcare Security Middleware for MediMate Malaysia
 * PDPA compliant with Malaysian healthcare regulatory requirements
 * Implements healthcare-grade security patterns
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult } from 'express-validator';

// Healthcare data classification levels
export enum HealthcareDataClass {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted', // Patient health information
  TOP_SECRET = 'top_secret'  // Psychiatric, genetic data
}

// Malaysian healthcare security context
interface MalaysianHealthcareContext {
  providerId?: string;
  facilityType?: 'hospital' | 'clinic' | 'pharmacy' | 'lab';
  state?: string; // Malaysian state for regulatory compliance
  dataClassification?: HealthcareDataClass;
  pdpaConsent?: boolean;
  auditRequired?: boolean;
}

/**
 * Request sanitization middleware for healthcare data
 */
export const sanitizeHealthcareInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
      .replace(/[<>'"&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char] || char;
      });
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Add security headers for healthcare context
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Healthcare-Security', 'MediMate-Malaysia');

  next();
};

/**
 * Malaysian IC number validation middleware
 */
export const validateMalaysianIC = (fieldName: string = 'ic_number') => [
  body(fieldName)
    .isLength({ min: 12, max: 14 })
    .withMessage('Malaysian IC number must be 12 digits')
    .matches(/^[0-9]{6}-?[0-9]{2}-?[0-9]{4}$/)
    .withMessage('Invalid Malaysian IC number format')
    .custom((value: string) => {
      // Remove hyphens for validation
      const ic = value.replace(/-/g, '');
      
      // Validate birth date (first 6 digits)
      const year = parseInt(ic.substr(0, 2));
      const month = parseInt(ic.substr(2, 2));
      const day = parseInt(ic.substr(4, 2));
      
      // Determine century (Malaysian IC logic)
      const fullYear = year <= 23 ? 2000 + year : 1900 + year;
      
      // Validate date
      const date = new Date(fullYear, month - 1, day);
      if (date.getFullYear() !== fullYear || 
          date.getMonth() !== month - 1 || 
          date.getDate() !== day) {
        throw new Error('Invalid birth date in IC number');
      }
      
      // Validate state code (7th and 8th digits)
      const stateCode = ic.substr(6, 2);
      const validStateCodes = [
        '01', '21', '22', '23', '24', // Johor
        '02', '25', '26', '27', // Kedah
        '03', '28', '29', // Kelantan
        '04', '30', // Melaka
        '05', '31', '59', // Negeri Sembilan
        '06', '32', '33', // Pahang
        '07', '34', '35', // Penang
        '08', '36', '37', '38', '39', // Perak
        '09', '40', // Perlis
        '10', '41', '42', '43', '44', // Selangor
        '11', '45', '46', // Terengganu
        '12', '47', '48', '49', // Sabah
        '13', '50', '51', '52', '53', // Sarawak
        '14', '54', '55', '56', '57', // Federal Territory
        '82' // Unknown state (for foreigners)
      ];
      
      if (!validStateCodes.includes(stateCode)) {
        throw new Error('Invalid state code in IC number');
      }
      
      return true;
    })
];

/**
 * Healthcare rate limiting with Malaysian context
 */
export const healthcareRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Different limits based on endpoint sensitivity
    if (req.path.includes('/patient') || req.path.includes('/medication')) {
      return 50; // Stricter for patient data
    }
    if (req.path.includes('/cultural') || req.path.includes('/prayer-times')) {
      return 200; // More lenient for cultural data
    }
    return 100; // Default limit
  },
  message: (req: Request) => ({
    error: 'Too many healthcare requests',
    code: 'HEALTHCARE_RATE_LIMIT',
    windowMs: 15 * 60 * 1000,
    cultural_message: {
      en: 'Please wait before making more healthcare requests',
      ms: 'Sila tunggu sebelum membuat permintaan perubatan lagi',
      zh: '请等待后再发送医疗请求',
      ta: 'மருத்துவ கோரிக்கைகளை மீண்டும் அனுப்புவதற்கு முன் காத்திருக்கவும்'
    }
  }),
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req: Request) => req.path.startsWith('/health')
});

/**
 * Slow down suspicious requests
 */
export const healthcareSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests at full speed
  delayMs: (req: Request) => {
    // Increase delay for sensitive endpoints
    if (req.path.includes('/patient') || req.path.includes('/auth')) {
      return 1000; // 1 second delay
    }
    return 500; // 500ms delay for others
  },
  maxDelayMs: 20000, // Maximum 20 second delay
  skipFailedRequests: true,
  skipSuccessfulRequests: false
});

/**
 * Malaysian healthcare data encryption helper
 */
export const encryptHealthcareData = (data: string, classification: HealthcareDataClass): string => {
  const algorithm = classification === HealthcareDataClass.TOP_SECRET ? 'aes-256-gcm' : 'aes-256-cbc';
  const key = process.env.HEALTHCARE_ENCRYPTION_KEY || crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${algorithm}:${iv.toString('hex')}:${encrypted}`;
};

/**
 * Malaysian healthcare data decryption helper
 */
export const decryptHealthcareData = (encryptedData: string): string => {
  const [algorithm, ivHex, encrypted] = encryptedData.split(':');
  const key = process.env.HEALTHCARE_ENCRYPTION_KEY || crypto.randomBytes(32);
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Healthcare data classification middleware
 */
export const classifyHealthcareData = (classification: HealthcareDataClass) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add classification to request context
    req.healthcareContext = {
      ...req.healthcareContext,
      dataClassification: classification,
      auditRequired: [
        HealthcareDataClass.CONFIDENTIAL,
        HealthcareDataClass.RESTRICTED,
        HealthcareDataClass.TOP_SECRET
      ].includes(classification)
    };
    
    // Set security headers based on classification
    if (classification === HealthcareDataClass.TOP_SECRET) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  };
};

/**
 * Malaysian state-specific compliance check
 */
export const checkMalaysianStateCompliance = (req: Request, res: Response, next: NextFunction): void => {
  const malaysianState = req.headers['x-malaysian-state'] as string;
  
  if (malaysianState) {
    const validStates = [
      'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
      'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
    ];
    
    if (!validStates.includes(malaysianState)) {
      res.status(400).json({
        error: 'Invalid Malaysian state code',
        code: 'INVALID_STATE_CODE',
        valid_states: validStates
      });
      return;
    }
    
    // Add state context to request
    req.healthcareContext = {
      ...req.healthcareContext,
      state: malaysianState
    };
  }
  
  next();
};

/**
 * Healthcare audit logging middleware
 */
export const auditHealthcareAccess = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Capture original res.json to log responses
  const originalJson = res.json;
  res.json = function(data: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log healthcare data access for PDPA compliance
    if (req.healthcareContext?.auditRequired) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'HEALTHCARE_ACCESS',
        request_id: req.id,
        method: req.method,
        path: req.path,
        user_agent: req.get('User-Agent'),
        ip: req.ip,
        data_classification: req.healthcareContext.dataClassification,
        malaysian_state: req.healthcareContext.state,
        response_status: res.statusCode,
        duration_ms: duration,
        pdpa_consent: req.healthcareContext.pdpaConsent,
        facility_type: req.healthcareContext.facilityType
      }));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Main healthcare security middleware
 */
export const healthcareSecurityMiddleware = [
  sanitizeHealthcareInput,
  healthcareSlowDown,
  healthcareRateLimit,
  checkMalaysianStateCompliance,
  auditHealthcareAccess,
  // Validation error handler
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Healthcare data validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        cultural_message: {
          en: 'Please check your healthcare information',
          ms: 'Sila semak maklumat perubatan anda',
          zh: '请检查您的医疗信息',
          ta: 'உங்கள் மருத்துவ தகவலை சரிபார்க்கவும்'
        }
      });
      return;
    }
    next();
  }
];

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      healthcareContext?: MalaysianHealthcareContext;
    }
  }
}