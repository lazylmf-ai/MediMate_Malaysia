/**
 * Healthcare Logging Middleware
 * PDPA-compliant logging for Malaysian healthcare data
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Healthcare logging middleware with PDPA compliance
 */
export const healthcareLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Log request with PDPA compliance
  const logData = {
    timestamp: new Date().toISOString(),
    request_id: req.id || generateRequestId(),
    method: req.method,
    url: req.path,
    user_agent: req.get('User-Agent'),
    ip_address: req.ip,
    malaysian_state: req.headers['x-malaysian-state'],
    cultural_context: req.headers['x-cultural-context'],
    data_classification: determineDataClassification(req.path),
    pdpa_sensitive: isPDPASensitiveEndpoint(req.path)
  };

  // Log healthcare data access
  if (logData.pdpa_sensitive) {
    console.log(`[HEALTHCARE-ACCESS] ${JSON.stringify(logData)}`);
  } else {
    console.log(`[API-REQUEST] ${req.method} ${req.path} - ${req.ip}`);
  }

  // Capture response for logging
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log response
    if (logData.pdpa_sensitive) {
      console.log(`[HEALTHCARE-RESPONSE] ${JSON.stringify({
        request_id: logData.request_id,
        status_code: res.statusCode,
        duration_ms: duration,
        data_size: data?.length || 0,
        timestamp: new Date().toISOString()
      })}`);
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Determine data classification based on endpoint
 */
function determineDataClassification(path: string): string {
  if (path.includes('/patients') || path.includes('/medical')) {
    return 'restricted';
  } else if (path.includes('/medications') || path.includes('/appointments')) {
    return 'confidential';
  } else if (path.includes('/providers')) {
    return 'internal';
  }
  return 'public';
}

/**
 * Check if endpoint handles PDPA-sensitive data
 */
function isPDPASensitiveEndpoint(path: string): boolean {
  const sensitiveEndpoints = [
    '/patients',
    '/medical-records',
    '/medications',
    '/appointments',
    '/emergency-contacts'
  ];
  
  return sensitiveEndpoints.some(endpoint => path.includes(endpoint));
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  healthcareLoggingMiddleware
};