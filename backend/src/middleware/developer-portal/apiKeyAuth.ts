/**
 * API Key Authentication Middleware for MediMate Malaysia Developer Portal
 * Validates API keys and enforces rate limits with Malaysian healthcare context
 */

import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../../services/developer-portal/apiKeyService';

// Extend Express Request interface to include API key information
declare global {
  namespace Express {
    interface Request {
      apiKey?: any;
      developer?: any;
      culturalContext?: {
        malaysianState?: string;
        preferredLanguage?: string;
        prayerTimeAware?: boolean;
        halalRequirements?: boolean;
      };
      rateLimitInfo?: {
        requestsPerMinute: { limit: number; current: number; resetTime: Date };
        requestsPerDay: { limit: number; current: number; resetTime: Date };
      };
    }
  }
}

export interface ApiKeyAuthOptions {
  required?: boolean;
  allowTestKeys?: boolean;
  requireMalaysianCompliance?: boolean;
  requiredPermissions?: string[];
  culturalFeatures?: string[];
}

/**
 * API Key Authentication Middleware
 */
export const apiKeyAuth = (options: ApiKeyAuthOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKeyService = ApiKeyService.getInstance();
    
    try {
      // Extract API key from headers
      const apiKey = extractApiKey(req);
      
      if (!apiKey) {
        if (options.required !== false) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'API_KEY_MISSING',
              message: 'API key is required',
              cultural_message: {
                en: 'API key is required for accessing Malaysian healthcare services',
                ms: 'Kunci API diperlukan untuk mengakses perkhidmatan kesihatan Malaysia',
                zh: '访问马来西亚医疗服务需要API密钥',
                ta: 'மலேசிய சுகாதார சேவைகளை அணுக API கீ தேவை'
              }
            }
          });
        }
        return next(); // Allow requests without API key if not required
      }

      // Validate API key
      const validation = await apiKeyService.validateApiKey(apiKey);
      
      if (!validation.isValid || !validation.apiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'API_KEY_INVALID',
            message: validation.error || 'Invalid API key',
            cultural_message: {
              en: 'Invalid API key for Malaysian healthcare services',
              ms: 'Kunci API tidak sah untuk perkhidmatan kesihatan Malaysia',
              zh: '马来西亚医疗服务的API密钥无效',
              ta: 'மலேசிய சுகாதார சேவைகளுக்கான API கீ தவறானது'
            }
          }
        });
      }

      const validApiKey = validation.apiKey;

      // Check test key restrictions
      if (!options.allowTestKeys && validApiKey.metadata.environment === 'development') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TEST_KEY_NOT_ALLOWED',
            message: 'Test API keys are not allowed for this endpoint',
            cultural_message: {
              en: 'Production API key required for Malaysian healthcare data',
              ms: 'Kunci API pengeluaran diperlukan untuk data kesihatan Malaysia',
              zh: '马来西亚医疗数据需要生产API密钥',
              ta: 'மலேசிய சுகாதார தரவுகளுக்கு உற்பத்தி API கீ தேவை'
            }
          }
        });
      }

      // Check Malaysian compliance requirements
      if (options.requireMalaysianCompliance) {
        if (!validApiKey.malaysianCompliance.pdpaCompliant) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PDPA_COMPLIANCE_REQUIRED',
              message: 'This endpoint requires PDPA 2010 compliant API key',
              cultural_message: {
                en: 'PDPA 2010 compliance required for Malaysian patient data',
                ms: 'Pematuhan PDPA 2010 diperlukan untuk data pesakit Malaysia',
                zh: '马来西亚患者数据需要符合PDPA 2010',
                ta: 'மலேசிய நோயாளி தரவுகளுக்கு PDPA 2010 இணக்கம் தேவை'
              }
            }
          });
        }
      }

      // Check required permissions
      if (options.requiredPermissions?.length) {
        const hasPermission = options.requiredPermissions.every(permission => {
          return validApiKey.permissions.includes('*') || 
                 validApiKey.permissions.includes(permission) ||
                 validApiKey.permissions.some(p => p.endsWith('*') && permission.startsWith(p.slice(0, -1)));
        });

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'API key does not have required permissions',
              required_permissions: options.requiredPermissions,
              cultural_message: {
                en: 'Additional permissions required for Malaysian healthcare features',
                ms: 'Kebenaran tambahan diperlukan untuk ciri kesihatan Malaysia',
                zh: '马来西亚医疗功能需要额外权限',
                ta: 'மலேசிய சுகாதார அம்சங்களுக்கு கூடுதல் அனுமதிகள் தேவை'
              }
            }
          });
        }
      }

      // Check cultural feature access
      if (options.culturalFeatures?.length) {
        const hasAccess = options.culturalFeatures.every(feature => {
          switch (feature) {
            case 'prayer-times':
              return validApiKey.culturalFeatures.prayerTimeAccess;
            case 'halal-validation':
              return validApiKey.culturalFeatures.halalValidationAccess;
            case 'translation':
              return validApiKey.culturalFeatures.translationAccess;
            case 'cultural-calendar':
              return validApiKey.culturalFeatures.culturalCalendarAccess;
            default:
              return false;
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'CULTURAL_FEATURE_ACCESS_DENIED',
              message: 'API key does not have access to required cultural features',
              required_features: options.culturalFeatures,
              cultural_message: {
                en: 'Access to Malaysian cultural features is restricted',
                ms: 'Akses kepada ciri budaya Malaysia adalah terhad',
                zh: '对马来西亚文化特色的访问受到限制',
                ta: 'மலேசிய கலாச்சார அம்சங்களுக்கான அணுகல் தடைசெய்யப்பட்டுள்ளது'
              }
            }
          });
        }
      }

      // Check rate limits
      const rateLimitCheck = await apiKeyService.checkRateLimit(validApiKey);
      
      if (!rateLimitCheck.allowed) {
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit-Minute': rateLimitCheck.limits.requestsPerMinute.limit.toString(),
          'X-RateLimit-Remaining-Minute': Math.max(0, rateLimitCheck.limits.requestsPerMinute.limit - rateLimitCheck.limits.requestsPerMinute.current).toString(),
          'X-RateLimit-Reset-Minute': Math.ceil(rateLimitCheck.limits.requestsPerMinute.resetTime.getTime() / 1000).toString(),
          'X-RateLimit-Limit-Day': rateLimitCheck.limits.requestsPerDay.limit.toString(),
          'X-RateLimit-Remaining-Day': Math.max(0, rateLimitCheck.limits.requestsPerDay.limit - rateLimitCheck.limits.requestsPerDay.current).toString(),
          'X-RateLimit-Reset-Day': Math.ceil(rateLimitCheck.limits.requestsPerDay.resetTime.getTime() / 1000).toString()
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded for Malaysian healthcare API',
            limits: rateLimitCheck.limits,
            cultural_message: {
              en: 'Too many requests to Malaysian healthcare services',
              ms: 'Terlalu banyak permintaan kepada perkhidmatan kesihatan Malaysia',
              zh: '对马来西亚医疗服务的请求过多',
              ta: 'மலேசிய சுகாதார சேவைகளுக்கு அதிக கோரிக்கைகள்'
            }
          }
        });
      }

      // Set rate limit headers for successful requests
      res.set({
        'X-RateLimit-Limit-Minute': rateLimitCheck.limits.requestsPerMinute.limit.toString(),
        'X-RateLimit-Remaining-Minute': Math.max(0, rateLimitCheck.limits.requestsPerMinute.limit - rateLimitCheck.limits.requestsPerMinute.current).toString(),
        'X-RateLimit-Reset-Minute': Math.ceil(rateLimitCheck.limits.requestsPerMinute.resetTime.getTime() / 1000).toString(),
        'X-RateLimit-Limit-Day': rateLimitCheck.limits.requestsPerDay.limit.toString(),
        'X-RateLimit-Remaining-Day': Math.max(0, rateLimitCheck.limits.requestsPerDay.limit - rateLimitCheck.limits.requestsPerDay.current).toString(),
        'X-RateLimit-Reset-Day': Math.ceil(rateLimitCheck.limits.requestsPerDay.resetTime.getTime() / 1000).toString()
      });

      // Extract cultural context from headers
      const culturalContext = {
        malaysianState: req.headers['x-malaysian-state'] as string,
        preferredLanguage: req.headers['x-preferred-language'] as string || 'en',
        prayerTimeAware: req.headers['x-prayer-time-aware'] === 'true',
        halalRequirements: req.headers['x-halal-requirements'] === 'true' || validApiKey.culturalFeatures.halalValidationAccess
      };

      // Attach information to request object
      req.apiKey = validApiKey;
      req.culturalContext = culturalContext;
      req.rateLimitInfo = rateLimitCheck.limits;

      // Set Malaysian healthcare context headers
      res.set({
        'X-API-Key-ID': validApiKey.id,
        'X-Malaysian-Healthcare': 'true',
        'X-PDPA-Compliant': validApiKey.malaysianCompliance.pdpaCompliant.toString(),
        'X-Cultural-Features': Object.entries(validApiKey.culturalFeatures)
          .filter(([, enabled]) => enabled)
          .map(([feature]) => feature)
          .join(','),
        'X-Supported-Languages': 'en,ms,zh,ta',
        'X-Timezone': 'Asia/Kuala_Lumpur'
      });

      // Log the request (will be done in response middleware)
      res.locals.startTime = Date.now();

      next();
    } catch (error) {
      console.error('API Key authentication error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication service error',
          cultural_message: {
            en: 'Malaysian healthcare authentication service temporarily unavailable',
            ms: 'Perkhidmatan pengesahan kesihatan Malaysia tidak tersedia buat masa ini',
            zh: '马来西亚医疗认证服务暂时不可用',
            ta: 'மலேசிய சுகாதார அங்கீகார சேவை தற்காலிகமாக கிடைக்கவில்லை'
          }
        }
      });
    }
  };
};

/**
 * Response logging middleware to track API usage
 */
export const logApiUsage = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Override res.end to capture response
    const originalEnd = res.end;
    
    res.end = function(chunk: any, encoding?: any) {
      // Log API usage if API key was used
      if (req.apiKey && res.locals.startTime) {
        const apiKeyService = ApiKeyService.getInstance();
        const responseTime = Date.now() - res.locals.startTime;
        
        // Determine cultural feature used
        let culturalFeature: string | undefined;
        if (req.path.includes('/cultural/prayer-times')) {
          culturalFeature = 'prayer-times';
        } else if (req.path.includes('/cultural/halal')) {
          culturalFeature = 'halal-validation';
        } else if (req.path.includes('/cultural/translate')) {
          culturalFeature = 'translation';
        } else if (req.path.includes('/cultural/calendar')) {
          culturalFeature = 'cultural-calendar';
        }

        apiKeyService.logApiKeyUsage(req.apiKey, {
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          culturalFeature,
          malaysianState: req.culturalContext?.malaysianState,
          language: req.culturalContext?.preferredLanguage,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
        });
      }

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * Extract API key from request headers
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('mk_')) {
      return token;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader && typeof apiKeyHeader === 'string' && apiKeyHeader.startsWith('mk_')) {
    return apiKeyHeader;
  }

  // Check query parameter (not recommended for production)
  const apiKeyQuery = req.query.api_key;
  if (apiKeyQuery && typeof apiKeyQuery === 'string' && apiKeyQuery.startsWith('mk_')) {
    return apiKeyQuery;
  }

  return null;
}

/**
 * Middleware specifically for cultural API endpoints
 */
export const culturalApiAuth = (culturalFeatures: string[]) => {
  return apiKeyAuth({
    required: true,
    requireMalaysianCompliance: true,
    culturalFeatures,
    requiredPermissions: ['read:cultural']
  });
};

/**
 * Middleware for patient data endpoints (requires PDPA compliance)
 */
export const patientDataAuth = () => {
  return apiKeyAuth({
    required: true,
    requireMalaysianCompliance: true,
    requiredPermissions: ['read:patients'],
    allowTestKeys: false
  });
};

/**
 * Middleware for healthcare provider endpoints
 */
export const healthcareProviderAuth = () => {
  return apiKeyAuth({
    required: true,
    requireMalaysianCompliance: true,
    requiredPermissions: ['read:providers', 'write:providers'],
    allowTestKeys: false
  });
};

export default {
  apiKeyAuth,
  logApiUsage,
  culturalApiAuth,
  patientDataAuth,
  healthcareProviderAuth
};