/**
 * Monitoring Service
 * 
 * Real-time patient vitals and health data monitoring service
 * with automated threshold detection and cultural-aware alerting.
 */

import { RedisService } from '../cache/redisService';
import { DatabaseService } from '../database/databaseService';
import { NotificationService } from './notificationService';
import { AuditService } from '../audit/auditService';
import * as cron from 'node-cron';

export interface VitalSigns {
    patientId: string;
    deviceId?: string;
    timestamp: Date;
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number; // Celsius
    oxygenSaturation?: number;
    respiratoryRate?: number;
    glucoseLevel?: number; // mg/dL
    weight?: number; // kg
    metadata?: {
        deviceType: string;
        location: string;
        batteryLevel?: number;
        signalStrength?: number;
    };
}

export interface VitalThresholds {
    patientId: string;
    heartRateMin: number;
    heartRateMax: number;
    systolicMin: number;
    systolicMax: number;
    diastolicMin: number;
    diastolicMax: number;
    temperatureMin: number;
    temperatureMax: number;
    oxygenSaturationMin: number;
    glucoseLevelMin: number;
    glucoseLevelMax: number;
    respiratoryRateMin: number;
    respiratoryRateMax: number;
    customThresholds?: Record<string, { min: number; max: number }>;
    alertSeverity: 'low' | 'medium' | 'high' | 'critical';
    culturalConsiderations: {
        ramadanAdjustments: boolean;
        fastingGlucoseAware: boolean;
        prayerTimeBuffer: number; // minutes
    };
}

export interface MonitoringAlert {
    id: string;
    patientId: string;
    alertType: 'threshold_breach' | 'device_malfunction' | 'missing_data' | 'critical_trend';
    severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
    vitalType: keyof VitalSigns;
    currentValue: number;
    thresholdValue: number;
    trend: 'improving' | 'stable' | 'worsening' | 'critical';
    message: string;
    culturalContext: {
        language: string;
        prayerTimeConsidered: boolean;
        ramadanStatus: boolean;
        localizedMessage: Record<string, string>;
    };
    createdAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
}

export interface PatientMonitoringStatus {
    patientId: string;
    isActive: boolean;
    lastDataReceived: Date;
    connectedDevices: string[];
    alertsActive: number;
    vitalsHistory: VitalSigns[];
    thresholds: VitalThresholds;
    monitoringStarted: Date;
}

export class MonitoringService {
    private static instance: MonitoringService;
    private redisService: RedisService;
    private databaseService: DatabaseService;
    private notificationService: NotificationService;
    private auditService: AuditService;
    
    // In-memory cache for active monitoring sessions
    private activeMonitoring: Map<string, PatientMonitoringStatus> = new Map();
    private vitalTrends: Map<string, VitalSigns[]> = new Map();
    
    // Monitoring intervals
    private readonly TREND_WINDOW_MINUTES = 30;
    private readonly DATA_TIMEOUT_MINUTES = 10;
    private readonly CRITICAL_ALERT_COOLDOWN_MINUTES = 5;

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.databaseService = DatabaseService.getInstance();
        this.notificationService = NotificationService.getInstance();
        this.auditService = AuditService.getInstance();

        this.setupScheduledJobs();
        this.setupRedisSubscriptions();
    }

    public static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    private setupScheduledJobs(): void {
        // Check for missing data every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.checkForMissingData();
        });

        // Process vital trends every 15 minutes
        cron.schedule('*/15 * * * *', () => {
            this.processTrendAnalysis();
        });

        // Clean up old monitoring data daily
        cron.schedule('0 2 * * *', () => {
            this.cleanupOldMonitoringData();
        });

        // Check device connectivity every minute
        cron.schedule('* * * * *', () => {
            this.checkDeviceConnectivity();
        });
    }

    private async setupRedisSubscriptions(): Promise<void> {
        try {
            await this.redisService.connect();

            // Subscribe to vital signs data from IoT devices
            await this.redisService.subscribeToHealthcareEvents('healthcare:vitals_raw', (message) => {
                this.handleIncomingVitalSigns(message);
            });

            // Subscribe to device status updates
            await this.redisService.subscribeToHealthcareEvents('healthcare:device_status', (message) => {
                this.handleDeviceStatusUpdate(message);
            });

            console.log('✅ Monitoring service Redis subscriptions established');
        } catch (error) {
            console.error('❌ Failed to setup monitoring Redis subscriptions:', error);
        }
    }

    async startPatientMonitoring(patientId: string, thresholds: VitalThresholds): Promise<void> {
        try {
            // Validate patient exists and has monitoring permissions
            const patient = await this.validatePatientForMonitoring(patientId);
            if (!patient) {
                throw new Error(`Patient ${patientId} not found or not eligible for monitoring`);
            }

            // Store monitoring configuration
            await this.storeMonitoringThresholds(patientId, thresholds);

            // Initialize monitoring status
            const monitoringStatus: PatientMonitoringStatus = {
                patientId,
                isActive: true,
                lastDataReceived: new Date(),
                connectedDevices: [],
                alertsActive: 0,
                vitalsHistory: [],
                thresholds,
                monitoringStarted: new Date()
            };

            this.activeMonitoring.set(patientId, monitoringStatus);
            this.vitalTrends.set(patientId, []);

            // Store in Redis for persistence
            await this.redisService.getClient().setEx(
                `monitoring:active:${patientId}`,
                86400, // 24 hours
                JSON.stringify(monitoringStatus)
            );

            // Subscribe to patient's vital signs channel
            await this.redisService.subscribeToHealthcareEvents(`vitals:${patientId}`, (message) => {
                this.processPatientVitalSigns(patientId, message);
            });

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'monitoring_started',
                patientId,
                success: true,
                metadata: {
                    thresholds: thresholds,
                    monitoringStarted: new Date().toISOString()
                }
            });

            console.log(`✅ Started monitoring for patient ${patientId}`);

        } catch (error) {
            console.error(`❌ Failed to start monitoring for patient ${patientId}:`, error);
            
            await this.auditService.logHealthcareEvent({
                eventType: 'monitoring_start_failed',
                patientId,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });

            throw error;
        }
    }

    async stopPatientMonitoring(patientId: string, reason?: string): Promise<void> {
        try {
            const monitoring = this.activeMonitoring.get(patientId);
            if (!monitoring) {
                throw new Error(`No active monitoring found for patient ${patientId}`);
            }

            // Mark as inactive
            monitoring.isActive = false;

            // Store final monitoring session in database
            await this.storeMonitoringSession(monitoring);

            // Clean up from memory and Redis
            this.activeMonitoring.delete(patientId);
            this.vitalTrends.delete(patientId);
            await this.redisService.getClient().del(`monitoring:active:${patientId}`);

            // Unsubscribe from Redis channel
            await this.redisService.unsubscribeFromHealthcareEvents(`vitals:${patientId}`);

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'monitoring_stopped',
                patientId,
                success: true,
                metadata: {
                    reason: reason || 'Manual stop',
                    monitoringDuration: Date.now() - monitoring.monitoringStarted.getTime(),
                    totalVitalsReceived: monitoring.vitalsHistory.length,
                    totalAlertsGenerated: monitoring.alertsActive
                }
            });

            console.log(`✅ Stopped monitoring for patient ${patientId}`);

        } catch (error) {
            console.error(`❌ Failed to stop monitoring for patient ${patientId}:`, error);
            throw error;
        }
    }

    async recordVitalSigns(vitals: VitalSigns): Promise<void> {
        try {
            // Validate vital signs data
            this.validateVitalSigns(vitals);

            // Store in database
            await this.storeVitalSigns(vitals);

            // Update monitoring status if patient is actively monitored
            const monitoring = this.activeMonitoring.get(vitals.patientId);
            if (monitoring && monitoring.isActive) {
                monitoring.lastDataReceived = new Date();
                monitoring.vitalsHistory.push(vitals);

                // Keep only recent history in memory
                if (monitoring.vitalsHistory.length > 100) {
                    monitoring.vitalsHistory = monitoring.vitalsHistory.slice(-100);
                }

                // Update trends
                this.updateVitalTrends(vitals.patientId, vitals);

                // Check thresholds
                await this.checkVitalThresholds(vitals, monitoring.thresholds);

                // Publish to WebSocket for real-time updates
                await this.redisService.publishHealthcareEvent('healthcare:vitals', {
                    type: 'vital_signs_update',
                    patientId: vitals.patientId,
                    vitals: vitals,
                    timestamp: vitals.timestamp
                });
            }

            // Publish raw data for other services
            await this.redisService.publishHealthcareEvent('healthcare:vitals_raw', JSON.stringify(vitals));

        } catch (error) {
            console.error('Failed to record vital signs:', error);
            throw error;
        }
    }

    private handleIncomingVitalSigns(message: string): void {
        try {
            const vitals: VitalSigns = JSON.parse(message);
            this.recordVitalSigns(vitals);
        } catch (error) {
            console.error('Failed to handle incoming vital signs:', error);
        }
    }

    private processPatientVitalSigns(patientId: string, message: string): void {
        try {
            const vitals: VitalSigns = JSON.parse(message);
            if (vitals.patientId === patientId) {
                this.recordVitalSigns(vitals);
            }
        } catch (error) {
            console.error(`Failed to process vital signs for patient ${patientId}:`, error);
        }
    }

    private async checkVitalThresholds(vitals: VitalSigns, thresholds: VitalThresholds): Promise<void> {
        const alerts: MonitoringAlert[] = [];

        // Check each vital sign against thresholds
        if (vitals.heartRate !== undefined) {
            const alert = this.checkThreshold('heartRate', vitals.heartRate, thresholds.heartRateMin, thresholds.heartRateMax, vitals, thresholds);
            if (alert) alerts.push(alert);
        }

        if (vitals.bloodPressureSystolic !== undefined) {
            const alert = this.checkThreshold('bloodPressureSystolic', vitals.bloodPressureSystolic, thresholds.systolicMin, thresholds.systolicMax, vitals, thresholds);
            if (alert) alerts.push(alert);
        }

        if (vitals.bloodPressureDiastolic !== undefined) {
            const alert = this.checkThreshold('bloodPressureDiastolic', vitals.bloodPressureDiastolic, thresholds.diastolicMin, thresholds.diastolicMax, vitals, thresholds);
            if (alert) alerts.push(alert);
        }

        if (vitals.temperature !== undefined) {
            const alert = this.checkThreshold('temperature', vitals.temperature, thresholds.temperatureMin, thresholds.temperatureMax, vitals, thresholds);
            if (alert) alerts.push(alert);
        }

        if (vitals.oxygenSaturation !== undefined) {
            const alert = this.checkThreshold('oxygenSaturation', vitals.oxygenSaturation, thresholds.oxygenSaturationMin, 100, vitals, thresholds);
            if (alert) alerts.push(alert);
        }

        if (vitals.glucoseLevel !== undefined) {
            // Apply cultural considerations for glucose levels (fasting during Ramadan)
            const adjustedThresholds = await this.adjustGlucoseThresholdsForCulture(thresholds, vitals.patientId);
            const alert = this.checkThreshold('glucoseLevel', vitals.glucoseLevel, adjustedThresholds.min, adjustedThresholds.max, vitals, thresholds);
            if (alert) alerts.push(alert);
        }

        // Process alerts
        for (const alert of alerts) {
            await this.processMonitoringAlert(alert);
        }
    }

    private checkThreshold(
        vitalType: keyof VitalSigns, 
        value: number, 
        min: number, 
        max: number, 
        vitals: VitalSigns, 
        thresholds: VitalThresholds
    ): MonitoringAlert | null {
        if (value < min || value > max) {
            const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Determine severity based on how far outside normal range
            let severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
            const deviation = Math.max((min - value) / min, (value - max) / max);
            
            if (deviation > 0.5) severity = 'critical';
            else if (deviation > 0.3) severity = 'high';
            else if (deviation > 0.15) severity = 'medium';
            else severity = 'low';

            const trend = this.calculateVitalTrend(vitals.patientId, vitalType);

            return {
                id: alertId,
                patientId: vitals.patientId,
                alertType: 'threshold_breach',
                severity,
                vitalType,
                currentValue: value,
                thresholdValue: value < min ? min : max,
                trend,
                message: `${vitalType} reading ${value} is outside normal range (${min}-${max})`,
                culturalContext: {
                    language: 'en', // Would be fetched from patient preferences
                    prayerTimeConsidered: false,
                    ramadanStatus: false,
                    localizedMessage: {}
                },
                createdAt: new Date()
            };
        }

        return null;
    }

    private calculateVitalTrend(patientId: string, vitalType: keyof VitalSigns): 'improving' | 'stable' | 'worsening' | 'critical' {
        const trends = this.vitalTrends.get(patientId) || [];
        if (trends.length < 3) return 'stable';

        const recentValues = trends
            .slice(-5)
            .map(v => v[vitalType])
            .filter(v => v !== undefined) as number[];

        if (recentValues.length < 3) return 'stable';

        const firstValue = recentValues[0];
        const lastValue = recentValues[recentValues.length - 1];
        const change = (lastValue - firstValue) / firstValue;

        if (Math.abs(change) < 0.05) return 'stable';
        if (change > 0) return vitalType === 'heartRate' || vitalType === 'temperature' ? 'worsening' : 'improving';
        return vitalType === 'heartRate' || vitalType === 'temperature' ? 'improving' : 'worsening';
    }

    private updateVitalTrends(patientId: string, vitals: VitalSigns): void {
        let trends = this.vitalTrends.get(patientId) || [];
        trends.push(vitals);

        // Keep only recent trends (last 2 hours)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        trends = trends.filter(v => v.timestamp >= twoHoursAgo);

        this.vitalTrends.set(patientId, trends);
    }

    private async processMonitoringAlert(alert: MonitoringAlert): Promise<void> {
        try {
            // Store alert in database
            await this.storeMonitoringAlert(alert);

            // Get patient's cultural preferences and care team
            const patientPreferences = await this.getPatientCulturalPreferences(alert.patientId);
            
            // Send notification through notification service
            await this.notificationService.sendVitalSignsAlert(
                alert.patientId,
                { [alert.vitalType]: alert.currentValue },
                { [alert.vitalType]: alert.thresholdValue }
            );

            // Publish to WebSocket for real-time alerts
            await this.redisService.publishHealthcareEvent('healthcare:alerts', {
                type: 'monitoring_alert',
                alert,
                timestamp: alert.createdAt
            });

            // Update monitoring status
            const monitoring = this.activeMonitoring.get(alert.patientId);
            if (monitoring) {
                monitoring.alertsActive++;
            }

            console.log(`🚨 Generated monitoring alert ${alert.id} for patient ${alert.patientId}`);

        } catch (error) {
            console.error('Failed to process monitoring alert:', error);
        }
    }

    // Scheduled job implementations
    private async checkForMissingData(): Promise<void> {
        const now = new Date();
        const timeoutThreshold = new Date(now.getTime() - this.DATA_TIMEOUT_MINUTES * 60 * 1000);

        for (const [patientId, monitoring] of this.activeMonitoring.entries()) {
            if (monitoring.isActive && monitoring.lastDataReceived < timeoutThreshold) {
                const alert: MonitoringAlert = {
                    id: `missing_${Date.now()}_${patientId}`,
                    patientId,
                    alertType: 'missing_data',
                    severity: 'medium',
                    vitalType: 'timestamp' as keyof VitalSigns,
                    currentValue: 0,
                    thresholdValue: this.DATA_TIMEOUT_MINUTES,
                    trend: 'stable',
                    message: `No vital signs data received for ${this.DATA_TIMEOUT_MINUTES} minutes`,
                    culturalContext: {
                        language: 'en',
                        prayerTimeConsidered: false,
                        ramadanStatus: false,
                        localizedMessage: {}
                    },
                    createdAt: new Date()
                };

                await this.processMonitoringAlert(alert);
            }
        }
    }

    private async processTrendAnalysis(): Promise<void> {
        for (const [patientId] of this.activeMonitoring.entries()) {
            // Analyze trends and generate predictive alerts if needed
            await this.analyzeTrends(patientId);
        }
    }

    private async analyzeTrends(patientId: string): Promise<void> {
        const trends = this.vitalTrends.get(patientId) || [];
        if (trends.length < 10) return; // Need sufficient data for trend analysis

        // Simple trend analysis - could be enhanced with ML
        const recentTrends = trends.slice(-10);
        // Implementation for trend analysis would go here
    }

    private async checkDeviceConnectivity(): Promise<void> {
        // Check device connectivity status
        // Implementation would check device heartbeats and connectivity status
    }

    private async cleanupOldMonitoringData(): Promise<void> {
        // Clean up old monitoring data from memory and database
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Implementation for cleanup would go here
    }

    // Utility methods
    private validateVitalSigns(vitals: VitalSigns): void {
        if (!vitals.patientId) {
            throw new Error('Patient ID is required');
        }
        if (!vitals.timestamp) {
            throw new Error('Timestamp is required');
        }
        // Additional validation rules...
    }

    private async validatePatientForMonitoring(patientId: string): Promise<any> {
        const db = this.databaseService.getConnection();
        return await db.oneOrNone('SELECT * FROM patients WHERE id = $1 AND monitoring_enabled = true', [patientId]);
    }

    private async storeMonitoringThresholds(patientId: string, thresholds: VitalThresholds): Promise<void> {
        const db = this.databaseService.getConnection();
        
        await db.none(`
            INSERT INTO patient_vital_thresholds (
                patient_id, heart_rate_min, heart_rate_max, systolic_min, systolic_max,
                diastolic_min, diastolic_max, temperature_min, temperature_max,
                oxygen_saturation_min, glucose_level_min, glucose_level_max,
                respiratory_rate_min, respiratory_rate_max, custom_thresholds,
                alert_severity, cultural_considerations, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
            )
            ON CONFLICT (patient_id) DO UPDATE SET
                heart_rate_min = EXCLUDED.heart_rate_min,
                heart_rate_max = EXCLUDED.heart_rate_max,
                systolic_min = EXCLUDED.systolic_min,
                systolic_max = EXCLUDED.systolic_max,
                diastolic_min = EXCLUDED.diastolic_min,
                diastolic_max = EXCLUDED.diastolic_max,
                temperature_min = EXCLUDED.temperature_min,
                temperature_max = EXCLUDED.temperature_max,
                oxygen_saturation_min = EXCLUDED.oxygen_saturation_min,
                glucose_level_min = EXCLUDED.glucose_level_min,
                glucose_level_max = EXCLUDED.glucose_level_max,
                respiratory_rate_min = EXCLUDED.respiratory_rate_min,
                respiratory_rate_max = EXCLUDED.respiratory_rate_max,
                custom_thresholds = EXCLUDED.custom_thresholds,
                alert_severity = EXCLUDED.alert_severity,
                cultural_considerations = EXCLUDED.cultural_considerations,
                updated_at = NOW()
        `, [
            patientId,
            thresholds.heartRateMin,
            thresholds.heartRateMax,
            thresholds.systolicMin,
            thresholds.systolicMax,
            thresholds.diastolicMin,
            thresholds.diastolicMax,
            thresholds.temperatureMin,
            thresholds.temperatureMax,
            thresholds.oxygenSaturationMin,
            thresholds.glucoseLevelMin,
            thresholds.glucoseLevelMax,
            thresholds.respiratoryRateMin,
            thresholds.respiratoryRateMax,
            JSON.stringify(thresholds.customThresholds || {}),
            thresholds.alertSeverity,
            JSON.stringify(thresholds.culturalConsiderations)
        ]);
    }

    private async storeVitalSigns(vitals: VitalSigns): Promise<void> {
        const db = this.databaseService.getConnection();
        
        await db.none(`
            INSERT INTO vital_signs (
                patient_id, device_id, timestamp, heart_rate, blood_pressure_systolic,
                blood_pressure_diastolic, temperature, oxygen_saturation, respiratory_rate,
                glucose_level, weight, metadata, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
            )
        `, [
            vitals.patientId,
            vitals.deviceId || null,
            vitals.timestamp,
            vitals.heartRate || null,
            vitals.bloodPressureSystolic || null,
            vitals.bloodPressureDiastolic || null,
            vitals.temperature || null,
            vitals.oxygenSaturation || null,
            vitals.respiratoryRate || null,
            vitals.glucoseLevel || null,
            vitals.weight || null,
            JSON.stringify(vitals.metadata || {})
        ]);
    }

    private async storeMonitoringAlert(alert: MonitoringAlert): Promise<void> {
        const db = this.databaseService.getConnection();
        
        await db.none(`
            INSERT INTO monitoring_alerts (
                id, patient_id, alert_type, severity, vital_type, current_value,
                threshold_value, trend, message, cultural_context, created_at,
                acknowledged_at, acknowledged_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
        `, [
            alert.id,
            alert.patientId,
            alert.alertType,
            alert.severity,
            alert.vitalType,
            alert.currentValue,
            alert.thresholdValue,
            alert.trend,
            alert.message,
            JSON.stringify(alert.culturalContext),
            alert.createdAt,
            alert.acknowledgedAt || null,
            alert.acknowledgedBy || null
        ]);
    }

    private async storeMonitoringSession(monitoring: PatientMonitoringStatus): Promise<void> {
        const db = this.databaseService.getConnection();
        
        await db.none(`
            INSERT INTO monitoring_sessions (
                patient_id, is_active, last_data_received, connected_devices,
                alerts_active, monitoring_started, monitoring_ended, thresholds,
                total_vitals_received, session_duration_seconds, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, NOW()
            )
        `, [
            monitoring.patientId,
            monitoring.isActive,
            monitoring.lastDataReceived,
            JSON.stringify(monitoring.connectedDevices),
            monitoring.alertsActive,
            monitoring.monitoringStarted,
            JSON.stringify(monitoring.thresholds),
            monitoring.vitalsHistory.length,
            Math.floor((Date.now() - monitoring.monitoringStarted.getTime()) / 1000)
        ]);
    }

    private async getPatientCulturalPreferences(patientId: string): Promise<any> {
        const db = this.databaseService.getConnection();
        return await db.oneOrNone(`
            SELECT cp.* FROM cultural_preferences cp
            JOIN patients p ON cp.user_id = p.user_id
            WHERE p.id = $1
        `, [patientId]);
    }

    private async adjustGlucoseThresholdsForCulture(thresholds: VitalThresholds, patientId: string): Promise<{ min: number; max: number }> {
        // Adjust glucose thresholds based on cultural considerations (Ramadan fasting, etc.)
        if (thresholds.culturalConsiderations.fastingGlucoseAware) {
            // Check if it's Ramadan and patient is likely fasting
            // Adjust thresholds accordingly
            return {
                min: thresholds.glucoseLevelMin * 0.8, // Lower threshold during fasting
                max: thresholds.glucoseLevelMax
            };
        }
        
        return {
            min: thresholds.glucoseLevelMin,
            max: thresholds.glucoseLevelMax
        };
    }

    private handleDeviceStatusUpdate(message: string): void {
        try {
            const deviceStatus = JSON.parse(message);
            // Handle device connectivity and status updates
            console.log('Device status update:', deviceStatus);
        } catch (error) {
            console.error('Failed to handle device status update:', error);
        }
    }

    // Public methods for external access
    getActiveMonitoringCount(): number {
        return this.activeMonitoring.size;
    }

    getPatientMonitoringStatus(patientId: string): PatientMonitoringStatus | undefined {
        return this.activeMonitoring.get(patientId);
    }

    async getPatientVitalHistory(patientId: string, hours: number = 24): Promise<VitalSigns[]> {
        const db = this.databaseService.getConnection();
        return await db.manyOrNone(`
            SELECT * FROM vital_signs 
            WHERE patient_id = $1 
            AND timestamp > NOW() - INTERVAL '${hours} hours'
            ORDER BY timestamp DESC
        `, [patientId]);
    }
}

export default MonitoringService;