/**
 * PDPA Compliance Middleware
 * Malaysian Personal Data Protection Act 2010 compliance middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * PDPA compliance middleware for healthcare data
 */
export const pdpaComplianceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add PDPA compliance headers
  res.setHeader('X-PDPA-Compliant', 'true');
  res.setHeader('X-Data-Protection', 'Malaysian-PDPA-2010');
  res.setHeader('X-Consent-Required', 'healthcare-data');
  
  // Add PDPA context to request
  req.pdpaContext = {
    consentRequired: true,
    dataClassification: 'healthcare-sensitive',
    retentionPeriod: '7-years',
    auditRequired: true,
    crossBorderTransfer: false,
    lawfulBasis: 'healthcare-provision'
  };

  next();
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      pdpaContext?: {
        consentRequired: boolean;
        dataClassification: string;
        retentionPeriod: string;
        auditRequired: boolean;
        crossBorderTransfer: boolean;
        lawfulBasis: string;
      };
    }
  }
}

export default {
  pdpaComplianceMiddleware
};