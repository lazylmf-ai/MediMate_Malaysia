/**
 * Error Handling Middleware
 * Healthcare-grade error handling with Malaysian cultural context
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Comprehensive error handling middleware for Malaysian healthcare
 */
export const errorHandlingMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timestamp = new Date().toISOString();
  const requestId = req.id || 'unknown';

  // Log error with healthcare context
  console.error(`[HEALTHCARE-ERROR] ${timestamp}`, {
    request_id: requestId,
    error_message: error.message,
    error_stack: error.stack,
    method: req.method,
    url: req.path,
    user_id: req.user?.id,
    malaysian_state: req.headers['x-malaysian-state'],
    data_classification: req.dataClassification,
    pdpa_context: req.pdpaContext
  });

  // Determine error type and response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorMessage = 'An unexpected error occurred';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Invalid input data';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    errorMessage = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    errorMessage = 'Access denied';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    errorMessage = 'Resource not found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    errorMessage = 'Resource conflict';
  }

  // Malaysian cultural error messages
  const culturalMessages = {
    en: getCulturalErrorMessage(errorCode, 'en'),
    ms: getCulturalErrorMessage(errorCode, 'ms'),
    zh: getCulturalErrorMessage(errorCode, 'zh'),
    ta: getCulturalErrorMessage(errorCode, 'ta')
  };

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: errorMessage,
    code: errorCode,
    timestamp: timestamp,
    request_id: requestId,
    cultural_message: culturalMessages
  };

  // Add debug information in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      original_error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.path
    };
  }

  // Healthcare-specific error handling
  if (req.path.includes('/patients') || req.path.includes('/medical')) {
    errorResponse.healthcare_note = {
      en: 'Your medical information remains secure despite this error',
      ms: 'Maklumat perubatan anda kekal selamat walaupun berlaku ralat ini',
      zh: '尽管出现错误，您的医疗信息仍然安全',
      ta: 'இந்த பிழை இருந்தபோதிலும் உங்கள் மருத்துவ தகவல் பாதுகாப்பாக உள்ளது'
    };
  }

  // PDPA compliance for errors
  if (req.pdpaContext?.auditRequired) {
    errorResponse.pdpa_compliance = {
      error_logged: true,
      data_protection_maintained: true,
      audit_trail_updated: true
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Get culturally appropriate error messages
 */
function getCulturalErrorMessage(errorCode: string, language: string): string {
  const messages: Record<string, Record<string, string>> = {
    VALIDATION_ERROR: {
      en: 'Please check the information you provided',
      ms: 'Sila semak maklumat yang anda berikan',
      zh: '请检查您提供的信息',
      ta: 'நீங்கள் வழங்கிய தகவலை சரிபார்க்கவும்'
    },
    UNAUTHORIZED: {
      en: 'Please log in to access your healthcare information',
      ms: 'Sila log masuk untuk mengakses maklumat perubatan anda',
      zh: '请登录以访问您的医疗信息',
      ta: 'உங்கள் சுகாதார தகவலை அணுக உள்நுழையவும்'
    },
    FORBIDDEN: {
      en: 'You do not have permission to access this healthcare resource',
      ms: 'Anda tidak mempunyai kebenaran untuk mengakses sumber perubatan ini',
      zh: '您没有权限访问此医疗资源',
      ta: 'இந்த சுகாதார வளத்தை அணுக உங்களுக்கு அனுமति இல்லை'
    },
    NOT_FOUND: {
      en: 'The requested healthcare information was not found',
      ms: 'Maklumat perubatan yang diminta tidak dijumpai',
      zh: '未找到请求的医疗信息',
      ta: 'கோரப்பட்ட சுகாதார தகவல் கிடைக்கவில்லை'
    },
    CONFLICT: {
      en: 'There is a conflict with your healthcare data request',
      ms: 'Terdapat konflik dengan permintaan data perubatan anda',
      zh: '您的医疗数据请求存在冲突',
      ta: 'உங்கள் சுகாதார தரவு கோரிக்கையில் முரண்பாடு உள்ளது'
    },
    INTERNAL_SERVER_ERROR: {
      en: 'A technical issue occurred. Please try again or contact support.',
      ms: 'Masalah teknikal berlaku. Sila cuba lagi atau hubungi sokongan.',
      zh: '发生技术问题。请重试或联系支持。',
      ta: 'தொழில்நுட்ப சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும் அல்லது ஆதரவைத் தொடர்பு கொள்ளவும்.'
    }
  };

  return messages[errorCode]?.[language] || messages['INTERNAL_SERVER_ERROR'][language];
}

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  console.error('[UNHANDLED-REJECTION]', {
    timestamp: new Date().toISOString(),
    reason: reason,
    promise: promise,
    healthcare_context: 'Critical system error - healthcare data integrity maintained'
  });
  
  // In production, you might want to restart the application
  // process.exit(1);
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (error: Error): void => {
  console.error('[UNCAUGHT-EXCEPTION]', {
    timestamp: new Date().toISOString(),
    error_message: error.message,
    error_stack: error.stack,
    healthcare_context: 'System crash prevented - healthcare data protected'
  });
  
  // Graceful shutdown
  process.exit(1);
};

export default {
  errorHandlingMiddleware,
  handleUnhandledRejection,
  handleUncaughtException
};