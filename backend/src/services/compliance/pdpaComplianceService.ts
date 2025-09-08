/**
 * PDPA Compliance Service
 * 
 * Core service for Malaysian Personal Data Protection Act 2010 compliance
 * Handles consent management, data subject rights, and regulatory reporting
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface ConsentRecord {
    id: string;
    userId: string;
    consentType: string;
    consentGranted: boolean;
    consentDate: Date;
    expiryDate?: Date;
    legalBasis: string;
    purposes: string[];
    dataCategories: string[];
    consentMethod: string;
    ipAddress?: string;
    browserInfo?: string;
    consentEvidence: any;
}

interface DataAccessRequest {
    id: string;
    userId: string;
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
    requestStatus: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'partially_completed';
    requestDescription?: string;
    requestedDataCategories?: string[];
    dateRangeFrom?: Date;
    dateRangeTo?: Date;
    identityVerified: boolean;
    assignedTo?: string;
    estimatedCompletionDate?: Date;
    responseMethod: string;
}

interface DataBreachIncident {
    id: string;
    breachType: string;
    severityLevel: 'low' | 'medium' | 'high' | 'critical';
    incidentDate: Date;
    incidentDescription: string;
    affectedDataCategories: string[];
    estimatedAffectedUsers: number;
    containmentCompleted: boolean;
    pdpaNotificationRequired: boolean;
    userNotificationRequired: boolean;
}

interface ComplianceReport {
    reportType: string;
    reportPeriodStart: Date;
    reportPeriodEnd: Date;
    keyMetrics: any;
    complianceScore: number;
    pdpaComplianceStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant';
}

export class PDPAComplianceService {
    private dbPool: Pool;

    constructor(dbPool: Pool) {
        this.dbPool = dbPool;
    }

    // ============================================================================
    // CONSENT MANAGEMENT
    // ============================================================================

    /**
     * Record user consent for data processing
     */
    async recordConsent(consentData: {
        userId: string;
        consentType: string;
        purposes: string[];
        dataCategories: string[];
        consentMethod?: string;
        ipAddress?: string;
        browserInfo?: string;
        expiryMonths?: number;
    }): Promise<ConsentRecord> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');
            
            const consentId = uuidv4();
            const expiryDate = consentData.expiryMonths 
                ? new Date(Date.now() + consentData.expiryMonths * 30 * 24 * 60 * 60 * 1000)
                : undefined;
            
            // Insert consent record
            const query = `
                INSERT INTO consent_records (
                    id, user_id, consent_type, consent_granted, consent_date, expiry_date,
                    legal_basis, purposes, data_categories, consent_method, ip_address, 
                    browser_info, consent_evidence, consent_version, consent_language
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `;
            
            const values = [
                consentId,
                consentData.userId,
                consentData.consentType,
                true, // consentGranted
                new Date(),
                expiryDate,
                'consent',
                consentData.purposes,
                consentData.dataCategories,
                consentData.consentMethod || 'digital',
                consentData.ipAddress,
                consentData.browserInfo,
                JSON.stringify({
                    timestamp: new Date().toISOString(),
                    method: consentData.consentMethod || 'digital',
                    userAgent: consentData.browserInfo
                }),
                '1.0',
                'ms' // Default to Bahasa Malaysia
            ];
            
            const result = await client.query(query, values);
            
            // Log the consent action in audit log
            await client.query(
                `INSERT INTO audit_log (
                    table_name, operation, new_data, changed_by, compliance_reason,
                    data_subject_id, processing_purpose, legal_basis
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    'consent_records',
                    'INSERT',
                    JSON.stringify(result.rows[0]),
                    consentData.userId,
                    'PDPA consent recording',
                    consentData.userId,
                    'consent_management',
                    'consent'
                ]
            );
            
            await client.query('COMMIT');
            
            return result.rows[0];
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to record consent: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Withdraw user consent
     */
    async withdrawConsent(userId: string, consentId: string, withdrawalReason?: string): Promise<void> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Update consent record to withdrawn
            await client.query(
                `UPDATE consent_records 
                 SET withdrawn = true, withdrawal_date = NOW(), withdrawal_reason = $1
                 WHERE id = $2 AND user_id = $3`,
                [withdrawalReason, consentId, userId]
            );
            
            // Log withdrawal in audit
            await client.query(
                `INSERT INTO audit_log (
                    table_name, operation, new_data, changed_by, compliance_reason
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    'consent_records',
                    'UPDATE',
                    JSON.stringify({ withdrawn: true, withdrawal_reason: withdrawalReason }),
                    userId,
                    'PDPA consent withdrawal'
                ]
            );
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to withdraw consent: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Check if user has valid consent for specific purpose
     */
    async checkConsent(userId: string, purpose: string, dataCategory: string): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM consent_records 
            WHERE user_id = $1 
            AND consent_granted = true 
            AND withdrawn = false 
            AND $2 = ANY(purposes)
            AND $3 = ANY(data_categories)
            AND (expiry_date IS NULL OR expiry_date > NOW())
        `;
        
        const result = await this.dbPool.query(query, [userId, purpose, dataCategory]);
        return parseInt(result.rows[0].count) > 0;
    }

    /**
     * Get consent overview for user
     */
    async getUserConsentOverview(userId: string): Promise<any> {
        const query = `
            SELECT 
                consent_type,
                consent_granted,
                consent_date,
                expiry_date,
                withdrawn,
                withdrawal_date,
                purposes,
                data_categories
            FROM consent_records 
            WHERE user_id = $1 
            ORDER BY consent_date DESC
        `;
        
        const result = await this.dbPool.query(query, [userId]);
        return result.rows;
    }

    // ============================================================================
    // DATA SUBJECT RIGHTS
    // ============================================================================

    /**
     * Submit data access request (Right to Access)
     */
    async submitDataAccessRequest(requestData: {
        userId: string;
        requestType: string;
        requestDescription?: string;
        requestedDataCategories?: string[];
        dateRangeFrom?: Date;
        dateRangeTo?: Date;
        responseMethod?: string;
    }): Promise<DataAccessRequest> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');
            
            const requestId = uuidv4();
            const estimatedCompletionDate = new Date();
            estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 30); // 30 days as per PDPA
            
            const query = `
                INSERT INTO data_access_requests (
                    id, user_id, request_type, request_status, request_description,
                    requested_data_categories, date_range_from, date_range_to,
                    identity_verified, estimated_completion_date, response_method
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;
            
            const values = [
                requestId,
                requestData.userId,
                requestData.requestType,
                'pending',
                requestData.requestDescription,
                requestData.requestedDataCategories || [],
                requestData.dateRangeFrom,
                requestData.dateRangeTo,
                false, // identity_verified - will be verified separately
                estimatedCompletionDate,
                requestData.responseMethod || 'email'
            ];
            
            const result = await client.query(query, values);
            
            // Log in audit
            await client.query(
                `INSERT INTO audit_log (
                    table_name, operation, new_data, changed_by, compliance_reason
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    'data_access_requests',
                    'INSERT',
                    JSON.stringify(result.rows[0]),
                    requestData.userId,
                    'PDPA data subject rights request'
                ]
            );
            
            await client.query('COMMIT');
            
            return result.rows[0];
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to submit data access request: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Process data portability request
     */
    async processDataPortabilityRequest(requestId: string): Promise<any> {
        const client = await this.dbPool.connect();
        
        try {
            // Get request details
            const requestQuery = await client.query(
                'SELECT * FROM data_access_requests WHERE id = $1',
                [requestId]
            );
            
            if (requestQuery.rows.length === 0) {
                throw new Error('Data access request not found');
            }
            
            const request = requestQuery.rows[0];
            const userId = request.user_id;
            
            // Collect user data from all relevant tables
            const userData = {
                user_profile: await this.getUserProfile(userId),
                medical_records: await this.getUserMedicalRecords(userId, request),
                medications: await this.getUserMedications(userId),
                appointments: await this.getUserAppointments(userId, request),
                consent_records: await this.getUserConsentRecords(userId)
            };
            
            // Update request status
            await client.query(
                `UPDATE data_access_requests 
                 SET request_status = 'completed', actual_completion_date = NOW(),
                     response_sent = true, response_sent_at = NOW()
                 WHERE id = $1`,
                [requestId]
            );
            
            return {
                requestId,
                generatedAt: new Date(),
                userData,
                format: 'JSON',
                pdpaCompliance: true
            };
            
        } catch (error) {
            throw new Error(`Failed to process data portability request: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Process data erasure request (Right to be Forgotten)
     */
    async processDataErasureRequest(requestId: string, erasureType: 'full_deletion' | 'anonymization'): Promise<void> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get request details
            const requestQuery = await client.query(
                'SELECT * FROM data_access_requests WHERE id = $1',
                [requestId]
            );
            
            const request = requestQuery.rows[0];
            const userId = request.user_id;
            
            // Check for legal obligations that prevent erasure
            const legalCheck = await this.checkLegalObligationsForErasure(userId);
            
            if (legalCheck.hasLegalObligations) {
                throw new Error(`Cannot erase data due to legal obligations: ${legalCheck.reasons.join(', ')}`);
            }
            
            if (erasureType === 'full_deletion') {
                // Perform cascading deletion (be very careful!)
                await this.performDataDeletion(userId, client);
            } else {
                // Perform anonymization
                await this.performDataAnonymization(userId, client);
            }
            
            // Log erasure
            await client.query(
                `INSERT INTO data_erasure_log (
                    user_id, data_access_request_id, table_name, erasure_type,
                    erasure_method, performed_by
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, requestId, 'multiple_tables', erasureType, 'automated', 'system']
            );
            
            // Update request status
            await client.query(
                `UPDATE data_access_requests 
                 SET request_status = 'completed', actual_completion_date = NOW()
                 WHERE id = $1`,
                [requestId]
            );
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to process data erasure request: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // BREACH MANAGEMENT
    // ============================================================================

    /**
     * Report data breach incident
     */
    async reportDataBreach(breachData: {
        breachType: string;
        severityLevel: 'low' | 'medium' | 'high' | 'critical';
        incidentDate: Date;
        incidentDescription: string;
        affectedDataCategories: string[];
        estimatedAffectedUsers: number;
        discoveredBy: string;
    }): Promise<DataBreachIncident> {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');
            
            const incidentId = uuidv4();
            
            // Determine notification requirements
            const pdpaNotificationRequired = breachData.severityLevel === 'high' || breachData.severityLevel === 'critical';
            const userNotificationRequired = breachData.estimatedAffectedUsers > 0 && pdpaNotificationRequired;
            
            const query = `
                INSERT INTO data_breach_incidents (
                    id, breach_type, severity_level, incident_date, incident_description,
                    affected_data_categories, estimated_affected_users, discovered_by,
                    pdpa_notification_required, user_notification_required
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            
            const values = [
                incidentId,
                breachData.breachType,
                breachData.severityLevel,
                breachData.incidentDate,
                breachData.incidentDescription,
                breachData.affectedDataCategories,
                breachData.estimatedAffectedUsers,
                breachData.discoveredBy,
                pdpaNotificationRequired,
                userNotificationRequired
            ];
            
            const result = await client.query(query, values);
            
            // If high severity, immediately notify DPO
            if (breachData.severityLevel === 'high' || breachData.severityLevel === 'critical') {
                await this.notifyDataProtectionOfficer(incidentId, result.rows[0]);
            }
            
            await client.query('COMMIT');
            
            return result.rows[0];
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to report data breach: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Send breach notifications as required by PDPA
     */
    async sendBreachNotifications(incidentId: string): Promise<void> {
        const client = await this.dbPool.connect();
        
        try {
            // Get incident details
            const incidentQuery = await client.query(
                'SELECT * FROM data_breach_incidents WHERE id = $1',
                [incidentId]
            );
            
            const incident = incidentQuery.rows[0];
            
            // Send regulatory notification if required (within 72 hours)
            if (incident.pdpa_notification_required) {
                await this.sendRegulatoryNotification(incident);
                
                // Mark notification as sent
                await client.query(
                    'UPDATE data_breach_incidents SET pdpa_notification_sent = true, pdpa_notification_date = NOW() WHERE id = $1',
                    [incidentId]
                );
            }
            
            // Send user notifications if required
            if (incident.user_notification_required) {
                const affectedUsers = await this.getAffectedUsers(incident.affected_data_categories);
                
                for (const user of affectedUsers) {
                    await this.sendUserBreachNotification(user, incident);
                }
                
                await client.query(
                    'UPDATE data_breach_incidents SET user_notifications_sent = $1 WHERE id = $2',
                    [affectedUsers.length, incidentId]
                );
            }
            
        } catch (error) {
            throw new Error(`Failed to send breach notifications: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // COMPLIANCE REPORTING
    // ============================================================================

    /**
     * Generate monthly compliance report
     */
    async generateComplianceReport(reportType: string, periodStart: Date, periodEnd: Date): Promise<ComplianceReport> {
        const client = await this.dbPool.connect();
        
        try {
            // Collect compliance metrics
            const metrics = await this.collectComplianceMetrics(periodStart, periodEnd, client);
            
            // Calculate compliance score
            const complianceScore = this.calculateComplianceScore(metrics);
            
            // Determine overall status
            const pdpaComplianceStatus = this.determinePDPAComplianceStatus(complianceScore, metrics);
            
            // Generate executive summary
            const executiveSummary = this.generateExecutiveSummary(metrics, complianceScore);
            
            // Save report
            const reportId = uuidv4();
            await client.query(
                `INSERT INTO compliance_reports (
                    id, report_type, report_period_start, report_period_end,
                    key_metrics, compliance_score, pdpa_compliance_status,
                    executive_summary, generated_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    reportId,
                    reportType,
                    periodStart,
                    periodEnd,
                    JSON.stringify(metrics),
                    complianceScore,
                    pdpaComplianceStatus,
                    executiveSummary,
                    'system'
                ]
            );
            
            return {
                reportType,
                reportPeriodStart: periodStart,
                reportPeriodEnd: periodEnd,
                keyMetrics: metrics,
                complianceScore,
                pdpaComplianceStatus
            };
            
        } catch (error) {
            throw new Error(`Failed to generate compliance report: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private async getUserProfile(userId: string): Promise<any> {
        const result = await this.dbPool.query(
            'SELECT id, full_name, email, phone_number, preferred_language, created_at FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }

    private async getUserMedicalRecords(userId: string, request: any): Promise<any[]> {
        let query = 'SELECT * FROM medical_records WHERE user_id = $1';
        const params = [userId];
        
        if (request.date_range_from) {
            query += ' AND visit_date >= $2';
            params.push(request.date_range_from);
        }
        
        if (request.date_range_to) {
            query += ` AND visit_date <= $${params.length + 1}`;
            params.push(request.date_range_to);
        }
        
        const result = await this.dbPool.query(query, params);
        return result.rows;
    }

    private async getUserMedications(userId: string): Promise<any[]> {
        const result = await this.dbPool.query(
            'SELECT * FROM medications WHERE user_id = $1 AND active = true',
            [userId]
        );
        return result.rows;
    }

    private async getUserAppointments(userId: string, request: any): Promise<any[]> {
        const result = await this.dbPool.query(
            'SELECT * FROM appointments WHERE user_id = $1',
            [userId]
        );
        return result.rows;
    }

    private async getUserConsentRecords(userId: string): Promise<any[]> {
        const result = await this.dbPool.query(
            'SELECT * FROM consent_records WHERE user_id = $1',
            [userId]
        );
        return result.rows;
    }

    private async checkLegalObligationsForErasure(userId: string): Promise<{ hasLegalObligations: boolean; reasons: string[] }> {
        const reasons: string[] = [];
        
        // Check for active medical prescriptions
        const activeMeds = await this.dbPool.query(
            'SELECT COUNT(*) as count FROM medications WHERE user_id = $1 AND active = true',
            [userId]
        );
        
        if (parseInt(activeMeds.rows[0].count) > 0) {
            reasons.push('Active medical prescriptions require retention');
        }
        
        // Check for ongoing medical care
        const recentAppointments = await this.dbPool.query(
            'SELECT COUNT(*) as count FROM appointments WHERE user_id = $1 AND appointment_date > NOW() - INTERVAL \'6 months\'',
            [userId]
        );
        
        if (parseInt(recentAppointments.rows[0].count) > 0) {
            reasons.push('Recent medical care requires data retention for continuity of care');
        }
        
        return {
            hasLegalObligations: reasons.length > 0,
            reasons
        };
    }

    private async performDataDeletion(userId: string, client: any): Promise<void> {
        // WARNING: This is irreversible. In production, consider soft deletion or archival
        const tablesToDelete = [
            'adherence_logs',
            'medication_reminders', 
            'appointments',
            'medications',
            'medical_records',
            'emergency_contacts',
            'vaccination_records',
            'consent_records'
        ];
        
        for (const table of tablesToDelete) {
            await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        }
        
        // Finally delete user record
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    private async performDataAnonymization(userId: string, client: any): Promise<void> {
        // Anonymize user data while preserving medical research value
        const anonymizedId = uuidv4();
        
        // Update users table with anonymized data
        await client.query(
            `UPDATE users SET 
             full_name = 'ANONYMIZED_USER_' || $2,
             email = 'anonymized_' || $2 || '@medimate.local',
             phone_number = NULL,
             ic_number_hash = NULL
             WHERE id = $1`,
            [userId, anonymizedId.substring(0, 8)]
        );
    }

    private async notifyDataProtectionOfficer(incidentId: string, incident: any): Promise<void> {
        // This would integrate with notification system
        console.log(`DPO NOTIFICATION: High severity data breach incident ${incidentId} reported`);
    }

    private async sendRegulatoryNotification(incident: any): Promise<void> {
        // This would integrate with Malaysian regulatory authorities
        console.log(`REGULATORY NOTIFICATION: Breach incident ${incident.id} reported to authorities`);
    }

    private async sendUserBreachNotification(user: any, incident: any): Promise<void> {
        // This would integrate with email/SMS notification system
        console.log(`USER NOTIFICATION: Breach notification sent to user ${user.id}`);
    }

    private async getAffectedUsers(dataCategories: string[]): Promise<any[]> {
        // Get users affected by the breach based on data categories
        const result = await this.dbPool.query(
            'SELECT DISTINCT id, email FROM users LIMIT 100' // Placeholder - implement proper logic
        );
        return result.rows;
    }

    private async collectComplianceMetrics(periodStart: Date, periodEnd: Date, client: any): Promise<any> {
        const metrics = {
            totalDataSubjects: 0,
            activeConsents: 0,
            withdrawnConsents: 0,
            dataAccessRequests: 0,
            breachIncidents: 0,
            complianceViolations: 0,
            auditLogEntries: 0
        };
        
        // Collect various compliance metrics
        const queries = [
            { key: 'totalDataSubjects', query: 'SELECT COUNT(DISTINCT user_id) as count FROM audit_log WHERE changed_at BETWEEN $1 AND $2' },
            { key: 'activeConsents', query: 'SELECT COUNT(*) as count FROM consent_records WHERE consent_granted = true AND withdrawn = false' },
            { key: 'withdrawnConsents', query: 'SELECT COUNT(*) as count FROM consent_records WHERE withdrawn = true AND withdrawal_date BETWEEN $1 AND $2' },
            { key: 'dataAccessRequests', query: 'SELECT COUNT(*) as count FROM data_access_requests WHERE created_at BETWEEN $1 AND $2' },
            { key: 'breachIncidents', query: 'SELECT COUNT(*) as count FROM data_breach_incidents WHERE incident_date BETWEEN $1 AND $2' },
            { key: 'complianceViolations', query: 'SELECT COUNT(*) as count FROM compliance_violations WHERE detected_at BETWEEN $1 AND $2' },
            { key: 'auditLogEntries', query: 'SELECT COUNT(*) as count FROM audit_log WHERE changed_at BETWEEN $1 AND $2' }
        ];
        
        for (const { key, query } of queries) {
            const result = await client.query(query, [periodStart, periodEnd]);
            metrics[key] = parseInt(result.rows[0].count);
        }
        
        return metrics;
    }

    private calculateComplianceScore(metrics: any): number {
        // Simple compliance scoring algorithm
        let score = 100;
        
        // Deduct points for violations
        score -= metrics.complianceViolations * 10;
        
        // Deduct points for unhandled breach incidents
        score -= metrics.breachIncidents * 15;
        
        // Add points for good consent management
        if (metrics.withdrawnConsents === 0) score += 5;
        
        return Math.max(0, Math.min(100, score));
    }

    private determinePDPAComplianceStatus(score: number, metrics: any): 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant' {
        if (score >= 95 && metrics.complianceViolations === 0) return 'compliant';
        if (score >= 80) return 'minor_issues';
        if (score >= 60) return 'major_issues';
        return 'non_compliant';
    }

    private generateExecutiveSummary(metrics: any, score: number): string {
        return `PDPA Compliance Summary: Score ${score}/100. 
                ${metrics.totalDataSubjects} data subjects processed, 
                ${metrics.activeConsents} active consents, 
                ${metrics.complianceViolations} violations detected, 
                ${metrics.breachIncidents} breach incidents reported.`;
    }
}

export default PDPAComplianceService;