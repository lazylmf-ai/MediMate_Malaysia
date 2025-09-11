/**
 * Real-time API Routes
 * 
 * RESTful API endpoints for managing real-time services including
 * WebSocket connections, notifications, monitoring, webhooks, and dashboards.
 */

import express, { Request, Response, NextFunction } from 'express';
import { WebSocketService } from '../services/realtime/webSocketService';
import { NotificationService } from '../services/realtime/notificationService';
import { MonitoringService } from '../services/realtime/monitoringService';
import { WebhookService } from '../services/realtime/webhookService';
import { DashboardService } from '../services/realtime/dashboardService';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// Middleware to check validation results
const checkValidation = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// WebSocket Connection Management Routes
/**
 * GET /api/v1/realtime/connections
 * Get current WebSocket connection statistics
 */
router.get('/connections', async (req: Request, res: Response) => {
    try {
        const webSocketService: WebSocketService = req.app.locals.webSocketService;
        
        const stats = {
            totalConnections: webSocketService.getActiveConnectionsCount(),
            connectionsByUserType: webSocketService.getActiveUserTypes(),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: stats,
            culturalMessage: {
                en: 'WebSocket connection statistics retrieved successfully',
                ms: 'Statistik sambungan WebSocket berjaya diambil',
                zh: '成功获取WebSocket连接统计信息',
                ta: 'WebSocket இணைப்பு புள்ளிவிவரங்கள் வெற்றிகரமாக பெறப்பட்டன'
            }
        });
    } catch (error) {
        console.error('Failed to get connection statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve connection statistics'
        });
    }
});

// Notification Management Routes
/**
 * POST /api/v1/realtime/notifications
 * Send a healthcare notification
 */
router.post('/notifications',
    [
        body('type').isIn(['vital_alert', 'appointment_reminder', 'medication_reminder', 'emergency_alert', 'provider_message', 'cultural_reminder']),
        body('priority').isIn(['low', 'medium', 'high', 'critical', 'emergency']),
        body('recipient').isObject(),
        body('title').isString().isLength({ min: 1, max: 200 }),
        body('message').isString().isLength({ min: 1, max: 1000 }),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const notificationService: NotificationService = req.app.locals.notificationService;
            
            const notificationId = await notificationService.sendHealthcareNotification(req.body);

            res.status(201).json({
                success: true,
                data: { notificationId },
                message: 'Healthcare notification sent successfully',
                culturalMessage: {
                    en: 'Healthcare notification sent successfully',
                    ms: 'Pemberitahuan kesihatan berjaya dihantar',
                    zh: '医疗通知发送成功',
                    ta: 'சுகாதார அறிவிப்பு வெற்றிகரமாக அனுப்பப்பட்டது'
                }
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send healthcare notification'
            });
        }
    }
);

/**
 * POST /api/v1/realtime/notifications/emergency
 * Send emergency alert
 */
router.post('/notifications/emergency',
    [
        body('alertData').isObject(),
        body('location').optional().isObject(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const notificationService: NotificationService = req.app.locals.notificationService;
            
            await notificationService.sendEmergencyAlert(req.body.alertData, req.body.location);

            res.json({
                success: true,
                message: 'Emergency alert broadcasted successfully',
                culturalMessage: {
                    en: 'Emergency alert broadcasted successfully',
                    ms: 'Amaran kecemasan berjaya disiarkan',
                    zh: '紧急警报广播成功',
                    ta: 'அவசர எச்சரிக்கை வெற்றிகரமாக ஒளிபரப்பப்பட்டது'
                }
            });
        } catch (error) {
            console.error('Failed to send emergency alert:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to broadcast emergency alert'
            });
        }
    }
);

// Patient Monitoring Routes
/**
 * POST /api/v1/realtime/monitoring/:patientId/start
 * Start monitoring for a patient
 */
router.post('/monitoring/:patientId/start',
    [
        param('patientId').isUUID(),
        body('thresholds').isObject(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const monitoringService: MonitoringService = req.app.locals.monitoringService;
            
            await monitoringService.startPatientMonitoring(req.params.patientId, req.body.thresholds);

            res.status(201).json({
                success: true,
                message: 'Patient monitoring started successfully',
                culturalMessage: {
                    en: 'Patient monitoring started successfully',
                    ms: 'Pemantauan pesakit berjaya dimulakan',
                    zh: '患者监控已成功启动',
                    ta: 'நோயாளி கண்காணிப்பு வெற்றிகரமாக தொடங்கப்பட்டது'
                }
            });
        } catch (error) {
            console.error('Failed to start patient monitoring:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start patient monitoring',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);

/**
 * POST /api/v1/realtime/monitoring/:patientId/stop
 * Stop monitoring for a patient
 */
router.post('/monitoring/:patientId/stop',
    [
        param('patientId').isUUID(),
        body('reason').optional().isString(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const monitoringService: MonitoringService = req.app.locals.monitoringService;
            
            await monitoringService.stopPatientMonitoring(req.params.patientId, req.body.reason);

            res.json({
                success: true,
                message: 'Patient monitoring stopped successfully',
                culturalMessage: {
                    en: 'Patient monitoring stopped successfully',
                    ms: 'Pemantauan pesakit berjaya dihentikan',
                    zh: '患者监控已成功停止',
                    ta: 'நோயாளி கண்காணிப்பு வெற்றிகரமாக நிறுத்தப்பட்டது'
                }
            });
        } catch (error) {
            console.error('Failed to stop patient monitoring:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to stop patient monitoring'
            });
        }
    }
);

/**
 * POST /api/v1/realtime/monitoring/:patientId/vitals
 * Record vital signs for a patient
 */
router.post('/monitoring/:patientId/vitals',
    [
        param('patientId').isUUID(),
        body('vitals').isObject(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const monitoringService: MonitoringService = req.app.locals.monitoringService;
            
            const vitals = {
                ...req.body.vitals,
                patientId: req.params.patientId,
                timestamp: new Date()
            };

            await monitoringService.recordVitalSigns(vitals);

            res.status(201).json({
                success: true,
                message: 'Vital signs recorded successfully',
                culturalMessage: {
                    en: 'Vital signs recorded successfully',
                    ms: 'Tanda vital berjaya direkodkan',
                    zh: '生命体征记录成功',
                    ta: 'முக்கிய அறிகுறிகள் வெற்றிகரமாக பதிவு செய்யப்பட்டன'
                }
            });
        } catch (error) {
            console.error('Failed to record vital signs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to record vital signs'
            });
        }
    }
);

/**
 * GET /api/v1/realtime/monitoring/:patientId/status
 * Get monitoring status for a patient
 */
router.get('/monitoring/:patientId/status',
    [
        param('patientId').isUUID(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const monitoringService: MonitoringService = req.app.locals.monitoringService;
            
            const status = monitoringService.getPatientMonitoringStatus(req.params.patientId);

            if (!status) {
                return res.status(404).json({
                    success: false,
                    error: 'No active monitoring found for this patient'
                });
            }

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Failed to get monitoring status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve monitoring status'
            });
        }
    }
);

// Webhook Management Routes
/**
 * POST /api/v1/realtime/webhooks
 * Create a new webhook endpoint
 */
router.post('/webhooks',
    [
        body('name').isString().isLength({ min: 1, max: 100 }),
        body('url').isURL(),
        body('method').isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        body('eventTypes').isArray().notEmpty(),
        body('healthcareIntegration').isObject(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const webhookService: WebhookService = req.app.locals.webhookService;
            
            const webhookId = await webhookService.createWebhookEndpoint(req.body);

            res.status(201).json({
                success: true,
                data: { webhookId },
                message: 'Webhook endpoint created successfully'
            });
        } catch (error) {
            console.error('Failed to create webhook endpoint:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create webhook endpoint'
            });
        }
    }
);

/**
 * GET /api/v1/realtime/webhooks
 * Get all webhook endpoints
 */
router.get('/webhooks', async (req: Request, res: Response) => {
    try {
        const webhookService: WebhookService = req.app.locals.webhookService;
        
        const webhooks = webhookService.getWebhookEndpoints();

        res.json({
            success: true,
            data: webhooks,
            count: webhooks.length
        });
    } catch (error) {
        console.error('Failed to get webhooks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve webhooks'
        });
    }
});

/**
 * GET /api/v1/realtime/webhooks/statistics
 * Get webhook statistics
 */
router.get('/webhooks/statistics', async (req: Request, res: Response) => {
    try {
        const webhookService: WebhookService = req.app.locals.webhookService;
        
        const stats = await webhookService.getWebhookStatistics();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Failed to get webhook statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve webhook statistics'
        });
    }
});

/**
 * DELETE /api/v1/realtime/webhooks/:webhookId
 * Delete a webhook endpoint
 */
router.delete('/webhooks/:webhookId',
    [
        param('webhookId').isString(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const webhookService: WebhookService = req.app.locals.webhookService;
            
            await webhookService.deleteWebhookEndpoint(req.params.webhookId);

            res.json({
                success: true,
                message: 'Webhook endpoint deleted successfully'
            });
        } catch (error) {
            console.error('Failed to delete webhook endpoint:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete webhook endpoint'
            });
        }
    }
);

// Dashboard Management Routes
/**
 * POST /api/v1/realtime/dashboard/subscribe
 * Create a dashboard subscription
 */
router.post('/dashboard/subscribe',
    [
        body('widgetIds').isArray().notEmpty(),
        body('culturalPreferences').isObject(),
        checkValidation
    ],
    async (req: Request, res: Response) => {
        try {
            const dashboardService: DashboardService = req.app.locals.dashboardService;
            
            // Get user info from token/session (would be implemented with auth middleware)
            const userId = req.user?.id; // Assuming auth middleware sets req.user
            const userType = req.user?.userType;
            const permissions = req.user?.permissions || [];

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const subscriptionId = await dashboardService.createDashboardSubscription(
                userId,
                userType,
                req.body.widgetIds,
                req.body.culturalPreferences,
                permissions
            );

            res.status(201).json({
                success: true,
                data: { subscriptionId },
                message: 'Dashboard subscription created successfully'
            });
        } catch (error) {
            console.error('Failed to create dashboard subscription:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create dashboard subscription'
            });
        }
    }
);

/**
 * GET /api/v1/realtime/dashboard/widgets
 * Get available dashboard widgets
 */
router.get('/dashboard/widgets', async (req: Request, res: Response) => {
    try {
        const dashboardService: DashboardService = req.app.locals.dashboardService;
        
        const widgets = dashboardService.getDashboardWidgets();

        res.json({
            success: true,
            data: widgets,
            count: widgets.length
        });
    } catch (error) {
        console.error('Failed to get dashboard widgets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve dashboard widgets'
        });
    }
});

/**
 * GET /api/v1/realtime/dashboard/subscriptions
 * Get dashboard subscriptions (admin only)
 */
router.get('/dashboard/subscriptions', async (req: Request, res: Response) => {
    try {
        const dashboardService: DashboardService = req.app.locals.dashboardService;
        
        const subscriptions = dashboardService.getDashboardSubscriptions();

        res.json({
            success: true,
            data: subscriptions,
            count: subscriptions.length
        });
    } catch (error) {
        console.error('Failed to get dashboard subscriptions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve dashboard subscriptions'
        });
    }
});

// Real-time System Status Routes
/**
 * GET /api/v1/realtime/status
 * Get overall real-time system status
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const webSocketService: WebSocketService = req.app.locals.webSocketService;
        const monitoringService: MonitoringService = req.app.locals.monitoringService;
        const dashboardService: DashboardService = req.app.locals.dashboardService;

        const status = {
            websocket: {
                activeConnections: webSocketService.getActiveConnectionsCount(),
                connectionsByUserType: webSocketService.getActiveUserTypes()
            },
            monitoring: {
                activeMonitoring: monitoringService.getActiveMonitoringCount()
            },
            dashboard: {
                activeDashboards: dashboardService.getActiveDashboardCount()
            },
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Failed to get real-time system status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve system status'
        });
    }
});

export default router;