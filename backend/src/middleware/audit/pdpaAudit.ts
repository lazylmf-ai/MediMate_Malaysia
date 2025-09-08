/**
 * PDPA Compliance Audit Middleware
 * 
 * Comprehensive audit logging system for Malaysian Personal Data Protection Act 2010 compliance
 * Provides real-time logging of all healthcare data access and modifications
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

// Database connection (will be injected)
let dbPool: Pool;

export const setDatabasePool = (pool: Pool): void => {
    dbPool = pool;
};

// PDPA data categories mapping
const DATA_CATEGORY_MAPPING: Record<string, string[]> = {
    'users': ['personal_data', 'contact_information', 'demographic_data'],
    'medical_records': ['health_data', 'medical_history', 'sensitive_personal_data'],
    'medications': ['health_data', 'prescription_data', 'sensitive_personal_data'],
    'adherence_logs': ['health_data', 'behavioral_data', 'sensitive_personal_data'],
    'vaccination_records': ['health_data', 'immunization_data', 'sensitive_personal_data'],
    'emergency_contacts': ['personal_data', 'contact_information'],
    'appointments': ['health_data', 'scheduling_data'],
    'insurance_coverage': ['financial_data', 'health_data'],
    'consent_records': ['consent_data', 'legal_data'],
    'audit_log': ['system_data', 'compliance_data']
};

// Sensitive data detection patterns
const SENSITIVE_DATA_PATTERNS = [
    /ic[_-]?number/i,
    /passport/i,
    /medical[_-]?record/i,
    /diagnosis/i,
    /prescription/i,
    /health/i,
    /religion/i,
    /race/i,
    /ethnic/i
];

interface AuditContext {
    sessionId: string;
    requestId: string;
    userId?: string;
    userAgent?: string;
    ipAddress?: string;
    dataSubjectId?: string;
    dataCategories: string[];
    processingPurpose: string;
    legalBasis: string;
    sensitiveDataFlag: boolean;
    geographicLocation: string;
    crossBorderTransfer: boolean;
    breachRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface PDPAAuditLog {
    tableName: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    recordId?: string;
    oldData?: any;
    newData?: any;
    changedBy: string;
    changedAt: Date;
    sessionId: string;
    requestId: string;
    dataSubjectId?: string;
    dataCategories: string[];
    processingPurpose: string;
    legalBasis: string;
    retentionPeriodDays: number;
    geographicLocation: string;
    sensitiveDataFlag: boolean;
    crossBorderTransfer: boolean;
    breachRiskLevel: string;
    ipAddress?: string;
    userAgent?: string;
    complianceReason?: string;
}

/**
 * Initialize PDPA audit context for the request
 */
export const initializePDPAAudit = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const sessionId = req.session?.id || uuidv4();
        const requestId = uuidv4();
        
        // Set database session variables for audit triggers
        if (dbPool) {
            dbPool.query('SELECT set_config($1, $2, true)', ['app.session_id', sessionId]);
            dbPool.query('SELECT set_config($1, $2, true)', ['app.request_id', requestId]);
            
            // Set user context if available
            if (req.user?.id) {
                dbPool.query('SELECT set_config($1, $2, true)', ['app.user_id', req.user.id]);
            }
        }
        
        // Create audit context
        const auditContext: AuditContext = {
            sessionId,
            requestId,
            userId: req.user?.id,
            userAgent: req.headers['user-agent'],
            ipAddress: getClientIP(req),
            dataCategories: [],
            processingPurpose: determineProcessingPurpose(req),
            legalBasis: determineLegalBasis(req),
            sensitiveDataFlag: false,
            geographicLocation: 'Malaysia', // Default to Malaysia
            crossBorderTransfer: false,
            breachRiskLevel: 'low'
        };
        
        // Attach to request
        req.pdpaAudit = auditContext;
        
        // Set response headers for compliance
        res.setHeader('X-PDPA-Request-ID', requestId);
        res.setHeader('X-PDPA-Session-ID', sessionId);
        
        next();
    } catch (error) {
        console.error('PDPA Audit initialization error:', error);
        next(); // Continue processing even if audit fails
    }
};

/**
 * Log PDPA-compliant data access
 */
export const logDataAccess = async (
    tableName: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    context: AuditContext,
    recordId?: string,
    oldData?: any,
    newData?: any
): Promise<void> => {
    if (!dbPool) {
        console.warn('Database pool not initialized for PDPA audit logging');
        return;
    }
    
    try {
        // Determine data categories
        const dataCategories = DATA_CATEGORY_MAPPING[tableName] || ['system_data'];
        
        // Check for sensitive data
        const sensitiveDataFlag = detectSensitiveData(tableName, newData || oldData);
        
        // Assess breach risk level
        const breachRiskLevel = assessBreachRisk(tableName, operation, sensitiveDataFlag);
        
        const auditLog: PDPAAuditLog = {
            tableName,
            operation,
            recordId,
            oldData: oldData ? sanitizeDataForLogging(oldData) : null,
            newData: newData ? sanitizeDataForLogging(newData) : null,
            changedBy: context.userId || 'system',
            changedAt: new Date(),
            sessionId: context.sessionId,
            requestId: context.requestId,
            dataSubjectId: extractDataSubjectId(tableName, newData || oldData),
            dataCategories,
            processingPurpose: context.processingPurpose,
            legalBasis: context.legalBasis,
            retentionPeriodDays: 2555, // 7 years for healthcare data
            geographicLocation: context.geographicLocation,
            sensitiveDataFlag,
            crossBorderTransfer: context.crossBorderTransfer,
            breachRiskLevel,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            complianceReason: 'PDPA healthcare data processing'
        };
        
        // Insert audit log
        const query = `
            INSERT INTO audit_log (
                table_name, operation, record_id, old_data, new_data, changed_by, changed_at,
                session_id, request_id, data_subject_id, data_categories, processing_purpose,
                legal_basis, retention_period_days, geographic_location, sensitive_data_flag,
                cross_border_transfer, breach_risk_level, ip_address, user_agent, compliance_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        `;
        
        const values = [
            auditLog.tableName,
            auditLog.operation,
            auditLog.recordId,
            auditLog.oldData ? JSON.stringify(auditLog.oldData) : null,
            auditLog.newData ? JSON.stringify(auditLog.newData) : null,
            auditLog.changedBy,
            auditLog.changedAt,
            auditLog.sessionId,
            auditLog.requestId,
            auditLog.dataSubjectId,
            auditLog.dataCategories,
            auditLog.processingPurpose,
            auditLog.legalBasis,
            auditLog.retentionPeriodDays,
            auditLog.geographicLocation,
            auditLog.sensitiveDataFlag,
            auditLog.crossBorderTransfer,
            auditLog.breachRiskLevel,
            auditLog.ipAddress,
            auditLog.userAgent,
            auditLog.complianceReason
        ];
        
        await dbPool.query(query, values);
        
        // Check for compliance violations
        await checkComplianceViolations(auditLog);
        
    } catch (error) {
        console.error('PDPA audit logging error:', error);
        // Log the error but don't stop processing
        if (dbPool) {
            try {
                await dbPool.query(
                    'INSERT INTO audit_log (table_name, operation, new_data, changed_by, compliance_reason) VALUES ($1, $2, $3, $4, $5)',
                    ['audit_error', 'ERROR', JSON.stringify({ error: error.message }), 'system', 'PDPA audit logging failure']
                );
            } catch (innerError) {
                console.error('Failed to log audit error:', innerError);
            }
        }
    }
};

/**
 * Middleware for automatic PDPA audit logging
 */
export const auditDatabaseOperations = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.pdpaAudit) {
        return next();
    }
    
    // Override database query methods to add audit logging
    const originalQuery = dbPool?.query;
    if (originalQuery && dbPool) {
        dbPool.query = async function(text: string, params?: any[]): Promise<any> {
            const result = await originalQuery.call(this, text, params);
            
            // Extract table name and operation from SQL
            const sqlInfo = parseSQLStatement(text);
            if (sqlInfo.tableName && sqlInfo.operation !== 'SELECT') {
                await logDataAccess(
                    sqlInfo.tableName,
                    sqlInfo.operation,
                    req.pdpaAudit!,
                    undefined, // recordId will be extracted from result if needed
                    undefined, // oldData not available at this level
                    params // newData approximation
                );
            }
            
            return result;
        };
        
        // Restore original function after request
        res.on('finish', () => {
            if (dbPool) {
                dbPool.query = originalQuery;
            }
        });
    }
    
    next();
};

/**
 * Check for PDPA compliance violations
 */
const checkComplianceViolations = async (auditLog: PDPAAuditLog): Promise<void> => {
    if (!dbPool) return;
    
    try {
        const violations: Array<{
            type: string;
            severity: string;
            description: string;
        }> = [];
        
        // Check for retention period violations
        if (auditLog.operation === 'SELECT') {
            const retentionCheck = await dbPool.query(
                `SELECT created_at FROM ${auditLog.tableName} 
                 WHERE id = $1 AND created_at < NOW() - INTERVAL '${auditLog.retentionPeriodDays} days'`,
                [auditLog.recordId]
            );
            
            if (retentionCheck.rows.length > 0) {
                violations.push({
                    type: 'retention_exceeded',
                    severity: 'high',
                    description: `Data accessed beyond retention period for table ${auditLog.tableName}`
                });
            }
        }
        
        // Check for unusual access patterns (potential breach)
        if (auditLog.sensitiveDataFlag) {
            const recentAccess = await dbPool.query(
                `SELECT COUNT(*) as count FROM audit_log 
                 WHERE data_subject_id = $1 AND sensitive_data_flag = true 
                 AND changed_at > NOW() - INTERVAL '1 hour'`,
                [auditLog.dataSubjectId]
            );
            
            if (parseInt(recentAccess.rows[0].count) > 10) {
                violations.push({
                    type: 'unusual_access_pattern',
                    severity: 'medium',
                    description: 'High frequency access to sensitive data detected'
                });
            }
        }
        
        // Log violations
        for (const violation of violations) {
            await dbPool.query(
                `INSERT INTO compliance_violations (
                    violation_type, severity_level, violation_description, 
                    affected_table, affected_record_id, affected_user_id,
                    detection_method, detected_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    violation.type,
                    violation.severity,
                    violation.description,
                    auditLog.tableName,
                    auditLog.recordId,
                    auditLog.dataSubjectId,
                    'automated',
                    new Date()
                ]
            );
        }
        
    } catch (error) {
        console.error('Compliance violation check error:', error);
    }
};

// Helper functions
const getClientIP = (req: Request): string => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           'unknown';
};

const determineProcessingPurpose = (req: Request): string => {
    const path = req.path.toLowerCase();
    
    if (path.includes('/medical') || path.includes('/health')) return 'healthcare_service_provision';
    if (path.includes('/medication')) return 'medication_management';
    if (path.includes('/appointment')) return 'appointment_scheduling';
    if (path.includes('/consent')) return 'consent_management';
    if (path.includes('/audit')) return 'compliance_monitoring';
    
    return 'system_administration';
};

const determineLegalBasis = (req: Request): string => {
    const path = req.path.toLowerCase();
    
    if (path.includes('/medical') || path.includes('/health')) return 'vital_interests';
    if (path.includes('/consent')) return 'consent';
    if (path.includes('/audit')) return 'legal_obligation';
    
    return 'legitimate_interests';
};

const detectSensitiveData = (tableName: string, data: any): boolean => {
    if (['medical_records', 'medications', 'vaccination_records'].includes(tableName)) {
        return true;
    }
    
    if (!data) return false;
    
    const dataString = JSON.stringify(data).toLowerCase();
    return SENSITIVE_DATA_PATTERNS.some(pattern => pattern.test(dataString));
};

const assessBreachRisk = (tableName: string, operation: string, sensitiveData: boolean): string => {
    if (sensitiveData && operation === 'DELETE') return 'critical';
    if (sensitiveData && operation === 'UPDATE') return 'high';
    if (sensitiveData) return 'medium';
    return 'low';
};

const extractDataSubjectId = (tableName: string, data: any): string | undefined => {
    if (!data) return undefined;
    
    // Try common patterns for user ID extraction
    return data.user_id || data.patient_id || data.id;
};

const sanitizeDataForLogging = (data: any): any => {
    if (!data) return null;
    
    const sanitized = { ...data };
    
    // Remove or hash sensitive fields
    const sensitiveFields = ['password', 'ic_number', 'passport_number', 'ssn'];
    
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    
    return sanitized;
};

const parseSQLStatement = (sql: string): { tableName?: string; operation?: string } => {
    const normalizedSql = sql.trim().toUpperCase();
    
    let operation: string | undefined;
    let tableName: string | undefined;
    
    if (normalizedSql.startsWith('SELECT')) {
        operation = 'SELECT';
        const fromMatch = normalizedSql.match(/FROM\s+(\w+)/);
        tableName = fromMatch ? fromMatch[1].toLowerCase() : undefined;
    } else if (normalizedSql.startsWith('INSERT')) {
        operation = 'INSERT';
        const intoMatch = normalizedSql.match(/INSERT\s+INTO\s+(\w+)/);
        tableName = intoMatch ? intoMatch[1].toLowerCase() : undefined;
    } else if (normalizedSql.startsWith('UPDATE')) {
        operation = 'UPDATE';
        const updateMatch = normalizedSql.match(/UPDATE\s+(\w+)/);
        tableName = updateMatch ? updateMatch[1].toLowerCase() : undefined;
    } else if (normalizedSql.startsWith('DELETE')) {
        operation = 'DELETE';
        const deleteMatch = normalizedSql.match(/DELETE\s+FROM\s+(\w+)/);
        tableName = deleteMatch ? deleteMatch[1].toLowerCase() : undefined;
    }
    
    return { tableName, operation };
};

// Type extensions
declare global {
    namespace Express {
        interface Request {
            pdpaAudit?: AuditContext;
        }
    }
}

export default {
    initializePDPAAudit,
    auditDatabaseOperations,
    logDataAccess,
    setDatabasePool
};