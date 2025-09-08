/**
 * Privacy and PDPA Compliance Routes
 * 
 * REST API routes for Malaysian Personal Data Protection Act 2010 compliance
 * Handles data subject rights, consent management, and audit functions
 */

import { Router } from 'express';
import { Pool } from 'pg';
import PrivacyRightsController from '../../controllers/privacy/privacyRightsController';
import { initializePDPAAudit, auditDatabaseOperations } from '../../middleware/audit/pdpaAudit';
import { authenticateUser, requireRole } from '../middleware/auth';

export const createPrivacyRoutes = (dbPool: Pool): Router => {
    const router = Router();
    const privacyController = new PrivacyRightsController(dbPool);

    // Apply PDPA audit middleware to all privacy routes
    router.use(initializePDPAAudit);
    router.use(auditDatabaseOperations);

    // ============================================================================
    // CONSENT MANAGEMENT ROUTES
    // ============================================================================

    /**
     * @route POST /api/privacy/consent
     * @desc Grant consent for data processing
     * @access Private
     */
    router.post('/consent', authenticateUser, privacyController.grantConsent);

    /**
     * @route DELETE /api/privacy/consent/:consentId
     * @desc Withdraw consent
     * @access Private
     */
    router.delete('/consent/:consentId', authenticateUser, privacyController.withdrawConsent);

    /**
     * @route GET /api/privacy/consent
     * @desc Get user's consent overview
     * @access Private
     */
    router.get('/consent', authenticateUser, privacyController.getConsentOverview);

    // ============================================================================
    // DATA SUBJECT RIGHTS ROUTES
    // ============================================================================

    /**
     * @route POST /api/privacy/access-request
     * @desc Submit data access request (Right to Access)
     * @access Private
     */
    router.post('/access-request', authenticateUser, privacyController.submitAccessRequest);

    /**
     * @route GET /api/privacy/access-request/:requestId
     * @desc Get access request status
     * @access Private
     */
    router.get('/access-request/:requestId', authenticateUser, privacyController.getAccessRequestStatus);

    /**
     * @route POST /api/privacy/data-portability/:requestId
     * @desc Process data portability request (Right to Data Portability)
     * @access Private
     */
    router.post('/data-portability/:requestId', authenticateUser, privacyController.processDataPortability);

    /**
     * @route POST /api/privacy/data-erasure/:requestId
     * @desc Process data erasure request (Right to be Forgotten)
     * @access Private
     */
    router.post('/data-erasure/:requestId', authenticateUser, privacyController.processDataErasure);

    // ============================================================================
    // USER DATA ACCESS ROUTES
    // ============================================================================

    /**
     * @route GET /api/privacy/my-data
     * @desc Get user's data summary
     * @access Private
     */
    router.get('/my-data', authenticateUser, privacyController.getUserDataSummary);

    // ============================================================================
    // ADMIN ROUTES FOR COMPLIANCE MANAGEMENT
    // ============================================================================

    /**
     * @route POST /api/privacy/admin/anonymization
     * @desc Start data anonymization job
     * @access Admin, DPO
     */
    router.post('/admin/anonymization', 
        authenticateUser, 
        requireRole(['admin', 'dpo']), 
        privacyController.startAnonymizationJob
    );

    /**
     * @route GET /api/privacy/admin/anonymization/:jobId
     * @desc Get anonymization job status
     * @access Admin, DPO
     */
    router.get('/admin/anonymization/:jobId', 
        authenticateUser, 
        requireRole(['admin', 'dpo']), 
        privacyController.getAnonymizationJobStatus
    );

    // ============================================================================
    // PDPA INFORMATION ROUTES
    // ============================================================================

    /**
     * @route GET /api/privacy/rights
     * @desc Get PDPA rights information
     * @access Public
     */
    router.get('/rights', (req, res) => {
        res.json({
            success: true,
            message: 'Malaysian PDPA Rights Information',
            data: {
                pdpaRights: {
                    rightToAccess: {
                        description: 'You have the right to request access to your personal data',
                        timeline: '21 days from request',
                        legalBasis: 'PDPA Section 30',
                        howToRequest: 'Submit a data access request through this API or contact our Data Protection Officer'
                    },
                    rightToRectification: {
                        description: 'You have the right to request correction of inaccurate personal data',
                        timeline: '21 days from request',
                        legalBasis: 'PDPA Section 31',
                        howToRequest: 'Submit a rectification request specifying the incorrect data and corrections needed'
                    },
                    rightToErasure: {
                        description: 'You have the right to request deletion of your personal data',
                        timeline: '21 days from request',
                        legalBasis: 'PDPA Section 32',
                        limitations: 'Subject to legal obligations and legitimate business interests',
                        howToRequest: 'Submit an erasure request; may be subject to legal review'
                    },
                    rightToDataPortability: {
                        description: 'You have the right to receive your personal data in a structured, machine-readable format',
                        timeline: '21 days from request',
                        legalBasis: 'PDPA Section 33',
                        formats: ['JSON', 'CSV', 'PDF'],
                        howToRequest: 'Submit a data portability request'
                    },
                    rightToRestriction: {
                        description: 'You have the right to request restriction of processing of your personal data',
                        timeline: '21 days from request',
                        legalBasis: 'PDPA Section 34',
                        scenarios: ['Accuracy disputed', 'Processing unlawful', 'Legal claims']
                    },
                    rightToObject: {
                        description: 'You have the right to object to processing of your personal data',
                        timeline: 'Immediate for direct marketing, 21 days for other processing',
                        legalBasis: 'PDPA Section 35',
                        grounds: ['Direct marketing', 'Legitimate interests', 'Research purposes']
                    }
                },
                dataProcessingInfo: {
                    dataController: 'MediMate Malaysia Sdn Bhd',
                    dpoContact: 'dpo@medimate.my',
                    legalBases: ['Consent', 'Vital interests', 'Legal obligation', 'Legitimate interests'],
                    dataCategories: ['Personal data', 'Health data', 'Contact information', 'Usage data'],
                    retentionPeriod: '7 years for healthcare data as per Malaysian regulations',
                    dataTransfers: 'Data is processed within Malaysia; no international transfers without consent'
                },
                contactInfo: {
                    dataProtectionOfficer: {
                        name: 'Data Protection Officer',
                        email: 'dpo@medimate.my',
                        phone: '+60-3-XXXX-XXXX',
                        address: 'MediMate Malaysia Sdn Bhd, Kuala Lumpur, Malaysia'
                    },
                    regulatoryAuthority: {
                        name: 'Personal Data Protection Department (PDPD)',
                        website: 'https://www.pdp.gov.my',
                        email: 'aduan@pdp.gov.my',
                        phone: '+60-3-8911-7000'
                    }
                }
            }
        });
    });

    /**
     * @route GET /api/privacy/policy
     * @desc Get privacy policy information
     * @access Public
     */
    router.get('/policy', (req, res) => {
        res.json({
            success: true,
            message: 'Privacy Policy Information',
            data: {
                lastUpdated: '2025-09-08',
                version: '2.0',
                applicableLaw: 'Personal Data Protection Act 2010 (Malaysia)',
                dataProcessingPurposes: [
                    'Healthcare service provision',
                    'Medication management and adherence tracking',
                    'Appointment scheduling and management',
                    'Emergency medical care coordination',
                    'Healthcare provider communication',
                    'Compliance with medical regulations',
                    'Healthcare research and analytics (with consent)',
                    'System security and fraud prevention'
                ],
                dataSharing: {
                    healthcareProviders: 'With explicit consent for care coordination',
                    emergencyServices: 'In life-threatening situations without prior consent',
                    regulatoryAuthorities: 'As required by Malaysian healthcare regulations',
                    researchInstitutions: 'Anonymized data with explicit consent',
                    thirdPartyServices: 'Limited to essential service providers with data processing agreements'
                },
                dataSecurity: {
                    encryptionAtRest: 'AES-256 encryption',
                    encryptionInTransit: 'TLS 1.3',
                    accessControls: 'Role-based access control (RBAC)',
                    auditLogging: 'Comprehensive PDPA-compliant audit trail',
                    backupSecurity: 'Encrypted backups with 7-year retention',
                    breachNotification: 'Within 72 hours to authorities, immediate to affected users'
                },
                userRights: 'See /api/privacy/rights for detailed information',
                updates: 'Users will be notified of policy changes via email and app notifications',
                consent: 'Explicit consent required for all non-essential data processing',
                complaints: 'Contact our DPO or file complaint with PDPD'
            }
        });
    });

    return router;
};

export default createPrivacyRoutes;