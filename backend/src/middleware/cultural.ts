/**
 * Malaysian Cultural Data Middleware
 * Adds Malaysian cultural context to all requests
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Cultural data middleware for Malaysian healthcare context
 */
export const culturalDataMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Detect Malaysian state from headers or IP
  const malayState = req.headers['x-malaysian-state'] as string || 'KUL';
  const preferredLanguage = req.headers['accept-language']?.includes('ms') ? 'ms' : 'en';
  
  // Add cultural context to request
  req.culturalContext = {
    malayState: malayState,
    timezone: 'Asia/Kuala_Lumpur',
    primaryLanguage: preferredLanguage,
    supportedLanguages: ['ms', 'en', 'zh', 'ta'],
    islamicCalendar: true,
    prayerTimeAware: true,
    culturalHolidays: true,
    halalRequirements: true,
    familyInvolvement: 'encouraged'
  };

  // Add cultural headers to response
  res.setHeader('X-Cultural-Context', 'Malaysian-Healthcare');
  res.setHeader('X-Timezone', 'Asia/Kuala_Lumpur');
  res.setHeader('X-Supported-Languages', 'ms,en,zh,ta');
  res.setHeader('X-Cultural-Features', 'islamic,multicultural,halal-aware');

  next();
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      culturalContext?: {
        malayState: string;
        timezone: string;
        primaryLanguage: string;
        supportedLanguages: string[];
        islamicCalendar: boolean;
        prayerTimeAware: boolean;
        culturalHolidays: boolean;
        halalRequirements: boolean;
        familyInvolvement: string;
      };
    }
  }
}

export default {
  culturalDataMiddleware
};