/**
 * Audit Service
 * 
 * PDPA-compliant audit logging for all system events
 * with Malaysian healthcare regulatory requirements.
 */

import { DatabaseService } from '../database/databaseService';

export interface AuditEvent {
    eventType: string;
    userId?: string;
    description?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    complianceReason?: string;
}

export interface HealthcareAuditEvent {
    eventType: string;
    userId?: string;
    userType?: string;
    patientId?: string;
    providerId?: string;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
}

export class AuditService {
    private static instance: AuditService;
    private dbService: DatabaseService;

    constructor() {
        this.dbService = DatabaseService.getInstance();
    }

    public static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    async logEvent(event: AuditEvent): Promise<void> {
        const db = this.dbService.getConnection();
        
        try {
            await db.none(`
                INSERT INTO authentication_audit (
                    event_type, user_id, event_description, ip_address, user_agent,
                    event_status, auth_method, risk_score, created_at
                ) VALUES ($1, $2, $3, $4, $5, 'success', 'system', 0, NOW())
            `, [
                event.eventType,
                event.userId || null,
                event.description || 'System event',
                event.ipAddress || null,
                event.userAgent || null
            ]);
        } catch (error) {
            console.error('Audit logging failed:', error);
            // Don't throw error to prevent breaking main functionality
        }
    }

    async logHealthcareEvent(event: HealthcareAuditEvent): Promise<void> {
        const db = this.dbService.getConnection();
        
        try {
            // For now, log to the authentication_audit table with additional metadata
            await db.none(`
                INSERT INTO authentication_audit (
                    event_type, user_id, event_description, ip_address, user_agent,
                    event_status, auth_method, risk_score, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'healthcare', 0, NOW())
            `, [
                event.eventType,
                event.userId || null,
                `Healthcare event: ${event.eventType}${event.errorMessage ? ` - ${event.errorMessage}` : ''}`,
                event.ipAddress || null,
                event.userAgent || null,
                event.success ? 'success' : 'failure'
            ]);
        } catch (error) {
            console.error('Failed to log healthcare audit event:', error);
        }
    }

    async logDataAccess(
        userId: string,
        resourceType: string,
        resourceId: string,
        action: string,
        success: boolean,
        ipAddress?: string,
        userAgent?: string,
        metadata?: any
    ): Promise<void> {
        const db = this.dbService.getConnection();
        
        try {
            await db.none(`
                INSERT INTO authentication_audit (
                    event_type, user_id, event_description, ip_address, user_agent,
                    event_status, auth_method, risk_score, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'data_access', 0, NOW())
            `, [
                'data_access',
                userId || null,
                `Data access: ${action} ${resourceType}${resourceId ? ` (ID: ${resourceId})` : ''}`,
                ipAddress || null,
                userAgent || null,
                success ? 'success' : 'failure'
            ]);
        } catch (error) {
            console.error('Failed to log data access audit event:', error);
        }
    }
}

export default AuditService;