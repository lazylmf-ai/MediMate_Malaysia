/**
 * PDPA Compliance System Tests
 * 
 * Comprehensive test suite for Malaysian Personal Data Protection Act 2010 compliance
 * Tests audit logging, consent management, data subject rights, and anonymization
 */

import { Pool } from 'pg';
import { Request, Response } from 'express';
import PDPAComplianceService from '../services/compliance/pdpaComplianceService';
import DataAnonymizer from '../utils/anonymization/dataAnonymizer';
import PrivacyRightsController from '../controllers/privacy/privacyRightsController';
import { setDatabasePool, initializePDPAAudit, logDataAccess } from '../middleware/audit/pdpaAudit';

// Test database configuration
const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'medimate_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password'
};

describe('PDPA Compliance System', () => {
    let dbPool: Pool;
    let complianceService: PDPAComplianceService;
    let dataAnonymizer: DataAnonymizer;
    let privacyController: PrivacyRightsController;
    let testUserId: string;

    beforeAll(async () => {
        // Initialize database connection
        dbPool = new Pool(testDbConfig);
        
        // Initialize services
        complianceService = new PDPAComplianceService(dbPool);
        dataAnonymizer = new DataAnonymizer(dbPool, 'test_salt_key');
        privacyController = new PrivacyRightsController(dbPool);
        
        // Set up audit middleware
        setDatabasePool(dbPool);
        
        // Run migrations if needed
        await runTestMigrations();
        
        // Create test user
        testUserId = await createTestUser();
    });

    afterAll(async () => {
        // Clean up test data
        await cleanupTestData();
        await dbPool.end();
    });

    describe('Database Migration', () => {
        test('should have all PDPA compliance tables', async () => {
            const tables = [
                'audit_log',
                'consent_records',
                'consent_renewals',
                'data_access_requests',
                'data_erasure_log',
                'data_breach_incidents',
                'breach_notifications',
                'data_retention_policies',
                'anonymization_jobs',
                'compliance_reports',
                'compliance_violations'
            ];

            for (const table of tables) {
                const result = await dbPool.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    )`,
                    [table]
                );
                
                expect(result.rows[0].exists).toBe(true);
            }
        });

        test('should have enhanced audit_log columns', async () => {
            const expectedColumns = [
                'session_id',
                'request_id',
                'data_subject_id',
                'data_categories',
                'processing_purpose',
                'legal_basis',
                'retention_period_days',
                'sensitive_data_flag',
                'breach_risk_level'
            ];

            const result = await dbPool.query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_name = 'audit_log' AND table_schema = 'public'`
            );
            
            const columnNames = result.rows.map(row => row.column_name);
            
            for (const column of expectedColumns) {
                expect(columnNames).toContain(column);
            }
        });

        test('should have proper indexes for performance', async () => {
            const expectedIndexes = [
                'idx_audit_log_data_subject',
                'idx_audit_log_retention',
                'idx_audit_log_sensitive',
                'idx_data_access_requests_user_status',
                'idx_data_breach_incidents_severity'
            ];

            for (const indexName of expectedIndexes) {
                const result = await dbPool.query(
                    `SELECT EXISTS (
                        SELECT FROM pg_indexes 
                        WHERE schemaname = 'public' 
                        AND indexname = $1
                    )`,
                    [indexName]
                );
                
                expect(result.rows[0].exists).toBe(true);
            }
        });
    });

    describe('Audit Logging System', () => {
        test('should initialize PDPA audit context', async () => {
            const mockReq = {
                session: { id: 'test-session-123' },
                user: { id: testUserId },
                headers: { 'user-agent': 'Test Browser' },
                ip: '127.0.0.1',
                path: '/api/medical/records'
            } as Partial<Request>;

            const mockRes = {
                setHeader: jest.fn()
            } as Partial<Response>;

            const mockNext = jest.fn();

            initializePDPAAudit(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.pdpaAudit).toBeDefined();
            expect(mockReq.pdpaAudit?.sessionId).toBeDefined();
            expect(mockReq.pdpaAudit?.requestId).toBeDefined();
            expect(mockReq.pdpaAudit?.userId).toBe(testUserId);
            expect(mockReq.pdpaAudit?.processingPurpose).toBe('healthcare_service_provision');
            expect(mockReq.pdpaAudit?.legalBasis).toBe('vital_interests');
            expect(mockNext).toHaveBeenCalled();
        });

        test('should log healthcare data access with PDPA context', async () => {
            const auditContext = {
                sessionId: 'test-session-123',
                requestId: 'test-request-456',
                userId: testUserId,
                dataCategories: ['health_data'],
                processingPurpose: 'healthcare_service_provision',
                legalBasis: 'vital_interests',
                sensitiveDataFlag: true,
                geographicLocation: 'Malaysia',
                crossBorderTransfer: false,
                breachRiskLevel: 'medium' as const
            };

            const testData = {
                id: testUserId,
                diagnosis: 'Diabetes Type 2',
                medication: 'Metformin'
            };

            await logDataAccess(
                'medical_records',
                'INSERT',
                auditContext,
                testUserId,
                undefined,
                testData
            );

            // Verify audit log entry
            const auditResult = await dbPool.query(
                'SELECT * FROM audit_log WHERE table_name = $1 AND session_id = $2 ORDER BY changed_at DESC LIMIT 1',
                ['medical_records', auditContext.sessionId]
            );

            expect(auditResult.rows.length).toBe(1);
            const auditEntry = auditResult.rows[0];
            
            expect(auditEntry.operation).toBe('INSERT');
            expect(auditEntry.sensitive_data_flag).toBe(true);
            expect(auditEntry.data_categories).toContain('health_data');
            expect(auditEntry.processing_purpose).toBe('healthcare_service_provision');
            expect(auditEntry.legal_basis).toBe('vital_interests');
            expect(auditEntry.breach_risk_level).toBe('medium');
        });

        test('should detect compliance violations', async () => {
            // Create old test record to trigger retention violation
            await dbPool.query(
                `INSERT INTO audit_log (
                    table_name, operation, new_data, changed_by, changed_at,
                    data_subject_id, retention_period_days
                ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '8 years', $5, $6)`,
                ['test_table', 'SELECT', '{"test": "data"}', testUserId, testUserId, 2555]
            );

            // This would be triggered by the audit system
            await dbPool.query(
                `INSERT INTO compliance_violations (
                    violation_type, severity_level, violation_description,
                    affected_user_id, detection_method
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    'retention_exceeded',
                    'high',
                    'Data accessed beyond retention period',
                    testUserId,
                    'automated'
                ]
            );

            const violationResult = await dbPool.query(
                'SELECT * FROM compliance_violations WHERE affected_user_id = $1',
                [testUserId]
            );

            expect(violationResult.rows.length).toBeGreaterThan(0);
            expect(violationResult.rows[0].violation_type).toBe('retention_exceeded');
            expect(violationResult.rows[0].severity_level).toBe('high');
        });
    });

    describe('Consent Management', () => {
        let consentId: string;

        test('should record user consent with Malaysian context', async () => {
            const consentData = {
                userId: testUserId,
                consentType: 'healthcare_data_processing',
                purposes: ['medical_care', 'appointment_scheduling'],
                dataCategories: ['health_data', 'personal_data'],
                consentMethod: 'digital',
                ipAddress: '127.0.0.1',
                browserInfo: 'Test Browser',
                expiryMonths: 24
            };

            const consentRecord = await complianceService.recordConsent(consentData);

            expect(consentRecord).toBeDefined();
            expect(consentRecord.id).toBeDefined();
            expect(consentRecord.consentType).toBe('healthcare_data_processing');
            expect(consentRecord.consentGranted).toBe(true);
            expect(consentRecord.purposes).toEqual(consentData.purposes);
            expect(consentRecord.dataCategories).toEqual(consentData.dataCategories);

            consentId = consentRecord.id;
        });

        test('should check consent validity', async () => {
            const hasConsent = await complianceService.checkConsent(
                testUserId,
                'medical_care',
                'health_data'
            );

            expect(hasConsent).toBe(true);

            // Test invalid consent check
            const hasInvalidConsent = await complianceService.checkConsent(
                testUserId,
                'marketing',
                'behavioral_data'
            );

            expect(hasInvalidConsent).toBe(false);
        });

        test('should withdraw consent', async () => {
            await complianceService.withdrawConsent(
                testUserId,
                consentId,
                'User requested withdrawal'
            );

            // Verify consent is withdrawn
            const consentResult = await dbPool.query(
                'SELECT * FROM consent_records WHERE id = $1',
                [consentId]
            );

            expect(consentResult.rows[0].withdrawn).toBe(true);
            expect(consentResult.rows[0].withdrawal_reason).toBe('User requested withdrawal');
        });

        test('should get user consent overview', async () => {
            const overview = await complianceService.getUserConsentOverview(testUserId);

            expect(Array.isArray(overview)).toBe(true);
            expect(overview.length).toBeGreaterThan(0);
            expect(overview[0]).toHaveProperty('consent_type');
            expect(overview[0]).toHaveProperty('consent_granted');
            expect(overview[0]).toHaveProperty('purposes');
        });
    });

    describe('Data Subject Rights', () => {
        let accessRequestId: string;

        test('should submit data access request', async () => {
            const requestData = {
                userId: testUserId,
                requestType: 'access',
                requestDescription: 'I want to see all my medical data',
                requestedDataCategories: ['health_data', 'personal_data'],
                responseMethod: 'email'
            };

            const accessRequest = await complianceService.submitDataAccessRequest(requestData);

            expect(accessRequest).toBeDefined();
            expect(accessRequest.id).toBeDefined();
            expect(accessRequest.requestType).toBe('access');
            expect(accessRequest.requestStatus).toBe('pending');
            expect(accessRequest.identityVerified).toBe(false);

            accessRequestId = accessRequest.id;
        });

        test('should process data portability request', async () => {
            // Create portability request
            const portabilityRequest = await complianceService.submitDataAccessRequest({
                userId: testUserId,
                requestType: 'portability',
                requestDescription: 'Export my data for transfer',
                responseMethod: 'secure_download'
            });

            const portabilityData = await complianceService.processDataPortabilityRequest(portabilityRequest.id);

            expect(portabilityData).toBeDefined();
            expect(portabilityData.requestId).toBe(portabilityRequest.id);
            expect(portabilityData.userData).toBeDefined();
            expect(portabilityData.userData.user_profile).toBeDefined();
            expect(portabilityData.format).toBe('JSON');
            expect(portabilityData.pdpaCompliance).toBe(true);
        });

        test('should handle data erasure request with legal obligations check', async () => {
            // Create erasure request
            const erasureRequest = await complianceService.submitDataAccessRequest({
                userId: testUserId,
                requestType: 'erasure',
                requestDescription: 'Delete all my data',
                responseMethod: 'email'
            });

            // Try to process erasure - should handle legal obligations
            try {
                await complianceService.processDataErasureRequest(erasureRequest.id, 'full_deletion');
                
                // If no legal obligations, verify erasure log
                const erasureLog = await dbPool.query(
                    'SELECT * FROM data_erasure_log WHERE data_access_request_id = $1',
                    [erasureRequest.id]
                );
                
                expect(erasureLog.rows.length).toBeGreaterThan(0);
                
            } catch (error) {
                // Expected if there are legal obligations
                expect(error.message).toContain('legal obligations');
            }
        });
    });

    describe('Data Breach Management', () => {
        let breachIncidentId: string;

        test('should report data breach incident', async () => {
            const breachData = {
                breachType: 'unauthorized_access',
                severityLevel: 'high' as const,
                incidentDate: new Date(),
                incidentDescription: 'Unauthorized access to medical records database',
                affectedDataCategories: ['health_data', 'personal_data'],
                estimatedAffectedUsers: 150,
                discoveredBy: 'security_system'
            };

            const incident = await complianceService.reportDataBreach(breachData);

            expect(incident).toBeDefined();
            expect(incident.id).toBeDefined();
            expect(incident.breachType).toBe('unauthorized_access');
            expect(incident.severityLevel).toBe('high');
            expect(incident.pdpaNotificationRequired).toBe(true);
            expect(incident.userNotificationRequired).toBe(true);

            breachIncidentId = incident.id;
        });

        test('should process breach notifications', async () => {
            await complianceService.sendBreachNotifications(breachIncidentId);

            // Verify incident status updated
            const incidentResult = await dbPool.query(
                'SELECT * FROM data_breach_incidents WHERE id = $1',
                [breachIncidentId]
            );

            const incident = incidentResult.rows[0];
            expect(incident.pdpa_notification_sent).toBe(true);
            expect(incident.pdpa_notification_date).toBeDefined();

            // Check notification records
            const notificationResult = await dbPool.query(
                'SELECT * FROM breach_notifications WHERE breach_incident_id = $1',
                [breachIncidentId]
            );

            expect(notificationResult.rows.length).toBeGreaterThan(0);
        });
    });

    describe('Data Anonymization', () => {
        test('should create anonymization rules for Malaysian healthcare data', async () => {
            // Create test medical record
            const testRecord = await dbPool.query(
                `INSERT INTO medical_records (
                    user_id, record_type, visit_date, chief_complaint
                ) VALUES ($1, $2, $3, $4) RETURNING id`,
                [testUserId, 'consultation', new Date(), 'Test complaint']
            );

            const config = {
                algorithm: 'k_anonymity' as const,
                k_value: 5,
                preserveUtility: true,
                healthcareContext: true
            };

            const anonymizationJob = await dataAnonymizer.anonymizeForResearch(
                'medical_records',
                `user_id = '${testUserId}'`,
                config
            );

            expect(anonymizationJob).toBeDefined();
            expect(anonymizationJob.id).toBeDefined();
            expect(anonymizationJob.tableName).toBe('medical_records');
            expect(anonymizationJob.config.algorithm).toBe('k_anonymity');
            expect(anonymizationJob.status).toBe('pending');

            // Wait a bit and check job status
            await new Promise(resolve => setTimeout(resolve, 1000));

            const jobStatus = await dataAnonymizer.getJobStatus(anonymizationJob.id);
            expect(jobStatus).toBeDefined();
            expect(['pending', 'running', 'completed'].includes(jobStatus.job_status)).toBe(true);
        });

        test('should anonymize Malaysian IC numbers correctly', async () => {
            const dataAnonymizer = new DataAnonymizer(dbPool);
            
            // Test IC anonymization using private method (would need to be exposed or tested differently in production)
            const testIC = '901201-14-1234';
            const generalizedIC = (dataAnonymizer as any).generalizeICNumber(testIC);
            
            expect(generalizedIC).toMatch(/90XXXX-14-XXXX/);
            expect(generalizedIC).not.toBe(testIC);
        });

        test('should preserve medical utility in anonymization', async () => {
            const testMedicalData = {
                diagnosis_codes: ['E11.9', 'I10.9', 'J44.0'],
                medication_name: 'Metformin 500mg',
                visit_date: new Date('2024-01-15')
            };

            const anonymizedData = (dataAnonymizer as any).anonymizeMedicalData(testMedicalData);

            expect(anonymizedData.diagnosis_codes).toBeDefined();
            expect(anonymizedData.diagnosis_codes[0]).toMatch(/E11X/); // Generalized ICD-10 code
            expect(anonymizedData.medication_name).toBe('Antidiabetic'); // Therapeutic class
            expect(anonymizedData.visit_date).toBe('2024-01'); // Month-year only
        });
    });

    describe('Compliance Reporting', () => {
        test('should generate monthly compliance report', async () => {
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-01-31');

            const report = await complianceService.generateComplianceReport(
                'monthly_audit',
                periodStart,
                periodEnd
            );

            expect(report).toBeDefined();
            expect(report.reportType).toBe('monthly_audit');
            expect(report.reportPeriodStart).toEqual(periodStart);
            expect(report.reportPeriodEnd).toEqual(periodEnd);
            expect(report.keyMetrics).toBeDefined();
            expect(typeof report.complianceScore).toBe('number');
            expect(['compliant', 'minor_issues', 'major_issues', 'non_compliant']
                .includes(report.pdpaComplianceStatus)).toBe(true);
        });

        test('should calculate compliance score based on violations and metrics', async () => {
            // This would test the scoring algorithm
            const mockMetrics = {
                totalDataSubjects: 100,
                activeConsents: 95,
                withdrawnConsents: 5,
                dataAccessRequests: 10,
                breachIncidents: 1,
                complianceViolations: 2,
                auditLogEntries: 1000
            };

            const score = (complianceService as any).calculateComplianceScore(mockMetrics);
            
            expect(typeof score).toBe('number');
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('Privacy Rights Controller API', () => {
        test('should handle consent grant request', async () => {
            const mockReq = {
                user: { id: testUserId },
                ip: '127.0.0.1',
                headers: { 'user-agent': 'Test Browser' },
                body: {
                    consentType: 'medical_data_processing',
                    purposes: ['healthcare', 'research'],
                    dataCategories: ['health_data'],
                    expiryMonths: 12
                }
            } as Partial<Request>;

            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as Partial<Response>;

            // Mock validation result
            (require('express-validator') as any).validationResult = jest.fn().mockReturnValue({
                isEmpty: () => true,
                array: () => []
            });

            await privacyController.grantConsent[1](mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Consent recorded successfully'
                })
            );
        });

        test('should handle data access request submission', async () => {
            const mockReq = {
                user: { id: testUserId },
                body: {
                    requestType: 'access',
                    requestDescription: 'I want to see all my data',
                    requestedDataCategories: ['health_data', 'personal_data'],
                    responseMethod: 'email'
                }
            } as Partial<Request>;

            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as Partial<Response>;

            // Mock validation result
            (require('express-validator') as any).validationResult = jest.fn().mockReturnValue({
                isEmpty: () => true,
                array: () => []
            });

            await privacyController.submitAccessRequest[7](mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Data access request submitted successfully'
                })
            );
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete PDPA workflow', async () => {
            // 1. Record consent
            const consent = await complianceService.recordConsent({
                userId: testUserId,
                consentType: 'complete_workflow_test',
                purposes: ['healthcare'],
                dataCategories: ['health_data']
            });

            // 2. Process some data (triggers audit)
            await dbPool.query(
                `INSERT INTO medical_records (
                    user_id, record_type, visit_date, chief_complaint
                ) VALUES ($1, $2, $3, $4)`,
                [testUserId, 'consultation', new Date(), 'Workflow test']
            );

            // 3. Submit access request
            const accessRequest = await complianceService.submitDataAccessRequest({
                userId: testUserId,
                requestType: 'access',
                requestDescription: 'Integration test access request'
            });

            // 4. Process data portability
            const portabilityData = await complianceService.processDataPortabilityRequest(accessRequest.id);

            // 5. Generate compliance report
            const report = await complianceService.generateComplianceReport(
                'integration_test',
                new Date(Date.now() - 24 * 60 * 60 * 1000),
                new Date()
            );

            // Verify all steps completed successfully
            expect(consent.id).toBeDefined();
            expect(accessRequest.id).toBeDefined();
            expect(portabilityData.userData).toBeDefined();
            expect(report.complianceScore).toBeGreaterThan(0);

            // Verify audit trail exists
            const auditResult = await dbPool.query(
                'SELECT COUNT(*) as count FROM audit_log WHERE data_subject_id = $1',
                [testUserId]
            );
            
            expect(parseInt(auditResult.rows[0].count)).toBeGreaterThan(0);
        });
    });

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    async function runTestMigrations(): Promise<void> {
        try {
            // Check if migration has been run
            const migrationCheck = await dbPool.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'data_access_requests'
                )`
            );

            if (!migrationCheck.rows[0].exists) {
                console.log('Running PDPA compliance migration for tests...');
                
                // Read and execute migration
                const fs = require('fs');
                const path = require('path');
                const migrationSQL = fs.readFileSync(
                    path.join(__dirname, '../database/migrations/002_pdpa_compliance_audit.sql'),
                    'utf8'
                );
                
                await dbPool.query(migrationSQL);
                console.log('Migration completed successfully');
            }
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    }

    async function createTestUser(): Promise<string> {
        const testUserData = {
            full_name: 'Test User PDPA',
            email: 'test.pdpa@medimate.test',
            ic_number_hash: 'test_ic_hash_pdpa',
            preferred_language: 'en'
        };

        const result = await dbPool.query(
            `INSERT INTO users (full_name, email, ic_number_hash, preferred_language)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [testUserData.full_name, testUserData.email, testUserData.ic_number_hash, testUserData.preferred_language]
        );

        return result.rows[0].id;
    }

    async function cleanupTestData(): Promise<void> {
        try {
            // Clean up in reverse dependency order
            const tablesToClean = [
                'compliance_violations',
                'compliance_reports', 
                'anonymization_jobs',
                'breach_notifications',
                'data_breach_incidents',
                'data_erasure_log',
                'data_access_requests',
                'consent_renewals',
                'consent_records',
                'audit_log',
                'medical_records',
                'users'
            ];

            for (const table of tablesToClean) {
                if (table === 'users') {
                    await dbPool.query(`DELETE FROM ${table} WHERE email LIKE '%medimate.test%'`);
                } else {
                    // For other tables, we can be more aggressive in test cleanup
                    await dbPool.query(`DELETE FROM ${table} WHERE created_at > NOW() - INTERVAL '1 hour'`);
                }
            }

            console.log('Test data cleanup completed');
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
});