/**
 * Privacy Rights Controller
 * 
 * REST API endpoints for Malaysian PDPA data subject rights
 * Handles access, rectification, erasure, portability, and objection requests
 */

import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Pool } from 'pg';
import PDPAComplianceService from '../../services/compliance/pdpaComplianceService';
import DataAnonymizer from '../../utils/anonymization/dataAnonymizer';

export class PrivacyRightsController {
    private dbPool: Pool;
    private complianceService: PDPAComplianceService;
    private dataAnonymizer: DataAnonymizer;

    constructor(dbPool: Pool) {
        this.dbPool = dbPool;
        this.complianceService = new PDPAComplianceService(dbPool);
        this.dataAnonymizer = new DataAnonymizer(dbPool);
    }

    // ============================================================================
    // CONSENT MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * Grant consent for data processing
     */
    grantConsent = [
        body('consentType').notEmpty().withMessage('Consent type is required'),
        body('purposes').isArray().withMessage('Purposes must be an array'),
        body('dataCategories').isArray().withMessage('Data categories must be an array'),
        body('expiryMonths').optional().isInt({ min: 1, max: 60 }).withMessage('Expiry months must be between 1 and 60'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User authentication required'
                    });
                    return;
                }

                const {
                    consentType,
                    purposes,
                    dataCategories,
                    expiryMonths
                } = req.body;

                const consentRecord = await this.complianceService.recordConsent({
                    userId,
                    consentType,
                    purposes,
                    dataCategories,
                    consentMethod: 'api',
                    ipAddress: req.ip,
                    browserInfo: req.headers['user-agent'],
                    expiryMonths
                });

                res.status(201).json({
                    success: true,
                    message: 'Consent recorded successfully',
                    data: {
                        consentId: consentRecord.id,
                        consentType: consentRecord.consentType,
                        consentDate: consentRecord.consentDate,
                        expiryDate: consentRecord.expiryDate,
                        purposes: consentRecord.purposes,
                        dataCategories: consentRecord.dataCategories
                    }
                });

            } catch (error) {
                console.error('Grant consent error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to record consent',
                    error: error.message
                });
            }
        }
    ];

    /**
     * Withdraw consent
     */
    withdrawConsent = [
        param('consentId').isUUID().withMessage('Valid consent ID required'),
        body('withdrawalReason').optional().isString().withMessage('Withdrawal reason must be a string'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User authentication required'
                    });
                    return;
                }

                const { consentId } = req.params;
                const { withdrawalReason } = req.body;

                await this.complianceService.withdrawConsent(userId, consentId, withdrawalReason);

                res.json({
                    success: true,
                    message: 'Consent withdrawn successfully',
                    data: {
                        consentId,
                        withdrawalDate: new Date(),
                        withdrawalReason
                    }
                });

            } catch (error) {
                console.error('Withdraw consent error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to withdraw consent',
                    error: error.message
                });
            }
        }
    ];

    /**
     * Get user's consent overview
     */
    getConsentOverview = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
                return;
            }

            const consentOverview = await this.complianceService.getUserConsentOverview(userId);

            res.json({
                success: true,
                message: 'Consent overview retrieved successfully',
                data: {
                    userId,
                    totalConsents: consentOverview.length,
                    activeConsents: consentOverview.filter(c => c.consent_granted && !c.withdrawn).length,
                    withdrawnConsents: consentOverview.filter(c => c.withdrawn).length,
                    consents: consentOverview
                }
            });

        } catch (error) {
            console.error('Get consent overview error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve consent overview',
                error: error.message
            });
        }
    };

    // ============================================================================
    // DATA ACCESS REQUEST ENDPOINTS (RIGHT TO ACCESS)
    // ============================================================================

    /**
     * Submit data access request
     */
    submitAccessRequest = [
        body('requestType')
            .isIn(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'])
            .withMessage('Invalid request type'),
        body('requestDescription').optional().isString().withMessage('Request description must be a string'),
        body('requestedDataCategories').optional().isArray().withMessage('Requested data categories must be an array'),
        body('dateRangeFrom').optional().isISO8601().withMessage('Invalid date format for dateRangeFrom'),
        body('dateRangeTo').optional().isISO8601().withMessage('Invalid date format for dateRangeTo'),
        body('responseMethod').optional().isIn(['email', 'postal_mail', 'secure_download']).withMessage('Invalid response method'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User authentication required'
                    });
                    return;
                }

                const {
                    requestType,
                    requestDescription,
                    requestedDataCategories,
                    dateRangeFrom,
                    dateRangeTo,
                    responseMethod
                } = req.body;

                const accessRequest = await this.complianceService.submitDataAccessRequest({
                    userId,
                    requestType,
                    requestDescription,
                    requestedDataCategories,
                    dateRangeFrom: dateRangeFrom ? new Date(dateRangeFrom) : undefined,
                    dateRangeTo: dateRangeTo ? new Date(dateRangeTo) : undefined,
                    responseMethod
                });

                res.status(201).json({
                    success: true,
                    message: `Data ${requestType} request submitted successfully`,
                    data: {
                        requestId: accessRequest.id,
                        requestType: accessRequest.requestType,
                        requestStatus: accessRequest.requestStatus,
                        estimatedCompletionDate: accessRequest.estimatedCompletionDate,
                        pdpaRights: this.getPDPARightsInfo(requestType)
                    }
                });

            } catch (error) {
                console.error('Submit access request error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to submit access request',
                    error: error.message
                });
            }
        }
    ];

    /**
     * Get access request status
     */
    getAccessRequestStatus = [
        param('requestId').isUUID().withMessage('Valid request ID required'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User authentication required'
                    });
                    return;
                }

                const { requestId } = req.params;

                const result = await this.dbPool.query(
                    'SELECT * FROM data_access_requests WHERE id = $1 AND user_id = $2',
                    [requestId, userId]
                );

                if (result.rows.length === 0) {
                    res.status(404).json({
                        success: false,
                        message: 'Access request not found'
                    });
                    return;
                }

                const request = result.rows[0];

                res.json({
                    success: true,
                    message: 'Access request status retrieved successfully',
                    data: {
                        requestId: request.id,
                        requestType: request.request_type,
                        requestStatus: request.request_status,
                        submittedDate: request.created_at,
                        estimatedCompletionDate: request.estimated_completion_date,
                        actualCompletionDate: request.actual_completion_date,
                        assignedTo: request.assigned_to,
                        responseMethod: request.response_method,
                        pdpaTimeline: this.getPDPATimeline(request.request_type)
                    }
                });

            } catch (error) {
                console.error('Get access request status error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to retrieve access request status',
                    error: error.message
                });
            }
        }
    ];

    /**
     * Process data portability request
     */
    processDataPortability = [
        param('requestId').isUUID().withMessage('Valid request ID required'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User authentication required'
                    });
                    return;
                }

                const { requestId } = req.params;

                // Verify request belongs to user and is portability type
                const requestCheck = await this.dbPool.query(
                    'SELECT * FROM data_access_requests WHERE id = $1 AND user_id = $2 AND request_type = $3',
                    [requestId, userId, 'portability']
                );

                if (requestCheck.rows.length === 0) {
                    res.status(404).json({
                        success: false,
                        message: 'Data portability request not found'
                    });
                    return;
                }

                const portabilityData = await this.complianceService.processDataPortabilityRequest(requestId);

                res.json({
                    success: true,
                    message: 'Data portability request processed successfully',
                    data: {
                        requestId,
                        userData: portabilityData.userData,
                        generatedAt: portabilityData.generatedAt,
                        format: portabilityData.format,
                        downloadInstructions: {
                            note: 'Your data has been compiled according to PDPA requirements',
                            retention: 'This export will be available for 30 days',
                            security: 'The data is anonymized for non-essential fields'
                        }
                    }
                });

            } catch (error) {
                console.error('Process data portability error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to process data portability request',
                    error: error.message
                });
            }
        }
    ];

    // ============================================================================
    // DATA ERASURE REQUEST ENDPOINTS (RIGHT TO BE FORGOTTEN)
    // ============================================================================

    /**
     * Process data erasure request
     */
    processDataErasure = [
        param('requestId').isUUID().withMessage('Valid request ID required'),
        body('erasureType')
            .isIn(['full_deletion', 'anonymization'])
            .withMessage('Erasure type must be full_deletion or anonymization'),
        body('confirmDeletion').equals('true').withMessage('Confirmation required for data erasure'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User authentication required'
                    });
                    return;
                }

                const { requestId } = req.params;
                const { erasureType } = req.body;

                // Verify request belongs to user and is erasure type
                const requestCheck = await this.dbPool.query(
                    'SELECT * FROM data_access_requests WHERE id = $1 AND user_id = $2 AND request_type = $3',
                    [requestId, userId, 'erasure']
                );

                if (requestCheck.rows.length === 0) {
                    res.status(404).json({
                        success: false,
                        message: 'Data erasure request not found'
                    });
                    return;
                }

                await this.complianceService.processDataErasureRequest(requestId, erasureType);

                res.json({
                    success: true,
                    message: `Data ${erasureType} completed successfully`,
                    data: {
                        requestId,
                        erasureType,
                        processedAt: new Date(),
                        pdpaCompliance: {
                            note: 'Data erasure completed in accordance with PDPA Section 30',
                            legalBasis: erasureType === 'full_deletion' ? 'Complete erasure' : 'Anonymization for research',
                            retentionPolicy: 'Medical data retained as required by Malaysian healthcare regulations'
                        }
                    }
                });

            } catch (error) {
                console.error('Process data erasure error:', error);
                
                if (error.message.includes('legal obligations')) {
                    res.status(422).json({
                        success: false,
                        message: 'Cannot process erasure request',
                        reason: error.message,
                        alternatives: [
                            'Consider anonymization instead of full deletion',
                            'Contact support for legal obligation review',
                            'Request specific data category erasure'
                        ]
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to process data erasure request',
                        error: error.message
                    });
                }
            }
        }
    ];

    // ============================================================================
    // DATA ANONYMIZATION ENDPOINTS
    // ============================================================================

    /**
     * Start data anonymization job
     */
    startAnonymizationJob = [
        body('tableName').notEmpty().withMessage('Table name is required'),
        body('algorithm')
            .isIn(['k_anonymity', 'l_diversity', 'differential_privacy', 'pseudonymization'])
            .withMessage('Invalid anonymization algorithm'),
        body('preserveUtility').optional().isBoolean().withMessage('Preserve utility must be boolean'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                // Only allow admin users to start anonymization jobs
                if (req.user?.role !== 'admin' && req.user?.role !== 'dpo') {
                    res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions for data anonymization'
                    });
                    return;
                }

                const {
                    tableName,
                    algorithm,
                    preserveUtility = true
                } = req.body;

                const config = {
                    algorithm,
                    preserveUtility,
                    healthcareContext: true
                };

                const job = await this.dataAnonymizer.anonymizeForResearch(
                    tableName,
                    '1=1', // Default to all records
                    config
                );

                res.status(202).json({
                    success: true,
                    message: 'Anonymization job started successfully',
                    data: {
                        jobId: job.id,
                        tableName: job.tableName,
                        algorithm: job.config.algorithm,
                        estimatedRecords: job.recordsToProcess,
                        status: job.status,
                        estimatedDuration: `${Math.ceil(job.recordsToProcess / 100)} minutes`
                    }
                });

            } catch (error) {
                console.error('Start anonymization job error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to start anonymization job',
                    error: error.message
                });
            }
        }
    ];

    /**
     * Get anonymization job status
     */
    getAnonymizationJobStatus = [
        param('jobId').isUUID().withMessage('Valid job ID required'),
        
        async (req: Request, res: Response): Promise<void> => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    });
                    return;
                }

                const { jobId } = req.params;
                const jobStatus = await this.dataAnonymizer.getJobStatus(jobId);

                if (!jobStatus) {
                    res.status(404).json({
                        success: false,
                        message: 'Anonymization job not found'
                    });
                    return;
                }

                res.json({
                    success: true,
                    message: 'Job status retrieved successfully',
                    data: {
                        jobId: jobStatus.id,
                        tableName: jobStatus.target_table,
                        algorithm: jobStatus.anonymization_algorithm,
                        status: jobStatus.job_status,
                        recordsProcessed: jobStatus.records_processed || 0,
                        recordsAnonymized: jobStatus.records_anonymized || 0,
                        estimatedRecords: jobStatus.record_count_estimated,
                        startedAt: jobStatus.started_at,
                        completedAt: jobStatus.completed_at,
                        errorLog: jobStatus.error_log
                    }
                });

            } catch (error) {
                console.error('Get anonymization job status error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to retrieve job status',
                    error: error.message
                });
            }
        }
    ];

    // ============================================================================
    // USER DATA ACCESS ENDPOINTS
    // ============================================================================

    /**
     * Get user's data summary
     */
    getUserDataSummary = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
                return;
            }

            const dataSummary = await this.getUserDataSummaryFromDatabase(userId);

            res.json({
                success: true,
                message: 'User data summary retrieved successfully',
                data: {
                    userId,
                    generatedAt: new Date(),
                    summary: dataSummary,
                    pdpaRights: {
                        rightToAccess: 'You can request a copy of all your personal data',
                        rightToRectification: 'You can request correction of inaccurate data',
                        rightToErasure: 'You can request deletion of your personal data',
                        rightToPortability: 'You can request your data in a structured format',
                        rightToRestriction: 'You can request limitation of data processing',
                        rightToObject: 'You can object to certain types of data processing'
                    }
                }
            });

        } catch (error) {
            console.error('Get user data summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve user data summary',
                error: error.message
            });
        }
    };

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private getPDPARightsInfo(requestType: string): any {
        const rightsInfo = {
            access: {
                description: 'Right to obtain confirmation and access to personal data',
                timeline: '21 days from request',
                legal_basis: 'PDPA Section 30'
            },
            rectification: {
                description: 'Right to correct inaccurate personal data',
                timeline: '21 days from request',
                legal_basis: 'PDPA Section 31'
            },
            erasure: {
                description: 'Right to erasure of personal data',
                timeline: '21 days from request',
                legal_basis: 'PDPA Section 32'
            },
            portability: {
                description: 'Right to receive personal data in structured format',
                timeline: '21 days from request',
                legal_basis: 'PDPA Section 33'
            },
            restriction: {
                description: 'Right to restrict processing of personal data',
                timeline: '21 days from request',
                legal_basis: 'PDPA Section 34'
            },
            objection: {
                description: 'Right to object to processing of personal data',
                timeline: '21 days from request',
                legal_basis: 'PDPA Section 35'
            }
        };

        return rightsInfo[requestType] || rightsInfo.access;
    }

    private getPDPATimeline(requestType: string): any {
        return {
            acknowledgment: '3 days from receipt',
            identity_verification: '5 days for verification',
            processing_time: '21 days maximum (PDPA requirement)',
            possible_extension: '60 days for complex requests',
            notification_required: requestType === 'erasure' ? 'Third parties will be notified' : 'No third party notification'
        };
    }

    private async getUserDataSummaryFromDatabase(userId: string): Promise<any> {
        const summary = {
            personalData: {},
            medicalData: {},
            consentRecords: {},
            activitySummary: {}
        };

        try {
            // Personal data summary
            const personalResult = await this.dbPool.query(
                'SELECT full_name, email, phone_number, preferred_language, created_at FROM users WHERE id = $1',
                [userId]
            );
            summary.personalData = personalResult.rows[0] || {};

            // Medical data summary
            const medicalResult = await this.dbPool.query(
                'SELECT COUNT(*) as medical_records, MAX(visit_date) as last_visit FROM medical_records WHERE user_id = $1',
                [userId]
            );
            const medicationResult = await this.dbPool.query(
                'SELECT COUNT(*) as active_medications FROM medications WHERE user_id = $1 AND active = true',
                [userId]
            );
            summary.medicalData = {
                totalRecords: parseInt(medicalResult.rows[0]?.medical_records || 0),
                lastVisit: medicalResult.rows[0]?.last_visit,
                activeMedications: parseInt(medicationResult.rows[0]?.active_medications || 0)
            };

            // Consent summary
            const consentResult = await this.dbPool.query(
                'SELECT COUNT(*) as total, COUNT(CASE WHEN withdrawn = false THEN 1 END) as active FROM consent_records WHERE user_id = $1',
                [userId]
            );
            summary.consentRecords = {
                totalConsents: parseInt(consentResult.rows[0]?.total || 0),
                activeConsents: parseInt(consentResult.rows[0]?.active || 0)
            };

            // Activity summary
            const activityResult = await this.dbPool.query(
                'SELECT COUNT(*) as audit_entries, MAX(changed_at) as last_activity FROM audit_log WHERE data_subject_id = $1',
                [userId]
            );
            summary.activitySummary = {
                totalAuditEntries: parseInt(activityResult.rows[0]?.audit_entries || 0),
                lastActivity: activityResult.rows[0]?.last_activity
            };

        } catch (error) {
            console.error('Error getting user data summary:', error);
        }

        return summary;
    }
}

export default PrivacyRightsController;