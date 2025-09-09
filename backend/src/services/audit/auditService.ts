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
    description: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    complianceReason?: string;
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
                event.description,
                event.ipAddress || null,
                event.userAgent || null
            ]);
        } catch (error) {
            console.error('Audit logging failed:', error);
            // Don't throw error to prevent breaking main functionality
        }
    }
}

export default AuditService;