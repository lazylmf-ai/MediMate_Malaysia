/**
 * WebSocket Event Handlers
 * 
 * Extended event handling methods for the WebSocket service
 * Supporting specialized healthcare communications and cultural context.
 */

import { Socket } from 'socket.io';
import { WebSocketService, WebSocketUser, HealthcareEvent } from './webSocketService';
import { RedisService } from '../cache/redisService';
import { AuditService } from '../audit/auditService';
import { DatabaseService } from '../database/databaseService';

export class WebSocketHandlers {
    private redisService: RedisService;
    private auditService: AuditService;
    private databaseService: DatabaseService;

    constructor() {
        this.redisService = RedisService.getInstance();
        this.auditService = AuditService.getInstance();
        this.databaseService = DatabaseService.getInstance();
    }

    async handleVitalSignsSubscription(socket: Socket, data: { patientId: string }): Promise<void> {
        const user: WebSocketUser = socket.data.user;

        // Verify permissions
        if (!this.canAccessPatientData(user, data.patientId)) {
            socket.emit('error', {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'You do not have permission to access this patient\'s vital signs',
                culturalMessage: this.getLocalizedMessage('insufficient_permissions', user.culturalPreferences.language)
            });
            return;
        }

        // Join vitals room for this patient
        const vitalRoom = `vitals:${data.patientId}`;
        await socket.join(vitalRoom);

        // Audit subscription
        await this.auditService.logHealthcareEvent({
            eventType: 'vitals_subscription',
            userId: user.userId,
            userType: user.userType,
            patientId: data.patientId,
            success: true,
            metadata: { socketId: socket.id }
        });

        // Send current vital signs if available
        const currentVitals = await this.getCurrentVitalSigns(data.patientId);
        if (currentVitals) {
            socket.emit('vitals_data', {
                patientId: data.patientId,
                data: currentVitals,
                timestamp: new Date().toISOString()
            });
        }

        socket.emit('subscription_confirmed', {
            type: 'vital_signs',
            patientId: data.patientId,
            message: 'Successfully subscribed to vital signs monitoring',
            culturalMessage: this.getLocalizedMessage('vitals_subscribed', user.culturalPreferences.language)
        });
    }

    async handleAppointmentSubscription(socket: Socket, data: { patientId?: string; providerId?: string }): Promise<void> {
        const user: WebSocketUser = socket.data.user;

        // Determine subscription scope based on user type
        let subscriptionScope: string;
        if (user.userType === 'patient') {
            subscriptionScope = `appointments:patient:${user.patientId}`;
        } else if (user.userType === 'healthcare_provider') {
            subscriptionScope = `appointments:provider:${user.providerId}`;
        } else if (user.userType === 'admin' && (data.patientId || data.providerId)) {
            subscriptionScope = data.patientId 
                ? `appointments:patient:${data.patientId}`
                : `appointments:provider:${data.providerId}`;
        } else {
            socket.emit('error', {
                code: 'INVALID_SUBSCRIPTION',
                message: 'Invalid appointment subscription request'
            });
            return;
        }

        await socket.join(subscriptionScope);

        await this.auditService.logHealthcareEvent({
            eventType: 'appointment_subscription',
            userId: user.userId,
            userType: user.userType,
            patientId: data.patientId,
            providerId: data.providerId,
            success: true,
            metadata: { socketId: socket.id, scope: subscriptionScope }
        });

        // Send upcoming appointments
        const upcomingAppointments = await this.getUpcomingAppointments(user, data);
        socket.emit('appointments_data', {
            appointments: upcomingAppointments,
            culturalContext: await this.addCulturalContextToAppointments(upcomingAppointments, user.culturalPreferences)
        });
    }

    async handleMedicationSubscription(socket: Socket, data: { patientId: string }): Promise<void> {
        const user: WebSocketUser = socket.data.user;

        if (!this.canAccessPatientData(user, data.patientId)) {
            socket.emit('error', {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'You do not have permission to access this patient\'s medications'
            });
            return;
        }

        const medicationRoom = `medications:${data.patientId}`;
        await socket.join(medicationRoom);

        await this.auditService.logHealthcareEvent({
            eventType: 'medication_subscription',
            userId: user.userId,
            userType: user.userType,
            patientId: data.patientId,
            success: true,
            metadata: { socketId: socket.id }
        });

        // Send current medication schedule with cultural considerations
        const medicationSchedule = await this.getMedicationScheduleWithCulturalContext(data.patientId, user.culturalPreferences);
        socket.emit('medication_schedule', medicationSchedule);
    }

    async handleEmergencyAlertSubscription(socket: Socket): Promise<void> {
        const user: WebSocketUser = socket.data.user;

        // Check if user has emergency alert permissions
        if (!user.permissions.includes('emergency_alerts')) {
            socket.emit('error', {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'You do not have permission to receive emergency alerts'
            });
            return;
        }

        await socket.join('emergency_alerts');
        await socket.join(`emergency_alerts:${user.culturalPreferences.state}`); // State-specific alerts

        await this.auditService.logHealthcareEvent({
            eventType: 'emergency_alert_subscription',
            userId: user.userId,
            userType: user.userType,
            success: true,
            metadata: { socketId: socket.id }
        });

        socket.emit('subscription_confirmed', {
            type: 'emergency_alerts',
            message: 'Successfully subscribed to emergency alerts',
            coverage: `Malaysia - ${user.culturalPreferences.state}`,
            culturalMessage: this.getLocalizedMessage('emergency_subscribed', user.culturalPreferences.language)
        });
    }

    async handleProviderMessage(socket: Socket, data: { recipientId: string; message: string; priority: 'low' | 'medium' | 'high' | 'critical' }): Promise<void> {
        const user: WebSocketUser = socket.data.user;

        // Only healthcare providers can send provider messages
        if (user.userType !== 'healthcare_provider') {
            socket.emit('error', {
                code: 'UNAUTHORIZED',
                message: 'Only healthcare providers can send provider messages'
            });
            return;
        }

        // Validate recipient exists and is appropriate
        const recipient = await this.validateMessageRecipient(data.recipientId);
        if (!recipient) {
            socket.emit('error', {
                code: 'INVALID_RECIPIENT',
                message: 'Invalid message recipient'
            });
            return;
        }

        // Create healthcare event for provider communication
        const providerMessage: HealthcareEvent = {
            type: 'provider_notification',
            providerId: user.providerId,
            patientId: recipient.type === 'patient' ? recipient.id : undefined,
            priority: data.priority,
            data: {
                senderId: user.userId,
                senderName: user.providerId, // Would be resolved from provider details
                message: data.message,
                recipientId: data.recipientId,
                messageType: 'provider_communication'
            },
            timestamp: new Date().toISOString(),
            eventId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Publish to Redis for distribution
        await this.redisService.publishHealthcareEvent('healthcare:provider_notifications', providerMessage);

        // Audit the message
        await this.auditService.logHealthcareEvent({
            eventType: 'provider_message_sent',
            userId: user.userId,
            userType: user.userType,
            providerId: user.providerId,
            success: true,
            metadata: {
                recipientId: data.recipientId,
                priority: data.priority,
                messageId: providerMessage.eventId
            }
        });

        socket.emit('message_sent', {
            messageId: providerMessage.eventId,
            timestamp: providerMessage.timestamp,
            status: 'delivered'
        });
    }

    async handleCulturalPreferencesUpdate(socket: Socket, data: any): Promise<void> {
        const user: WebSocketUser = socket.data.user;

        try {
            // Update cultural preferences in database
            await this.updateUserCulturalPreferences(user.userId, data);

            // Update socket data
            socket.data.user.culturalPreferences = { ...user.culturalPreferences, ...data };

            // Leave old cultural rooms and join new ones if needed
            if (data.language && data.language !== user.culturalPreferences.language) {
                await socket.leave(`language:${user.culturalPreferences.language}`);
                await socket.join(`language:${data.language}`);
            }

            if (data.state && data.state !== user.culturalPreferences.state) {
                await socket.leave(`state:${user.culturalPreferences.state}`);
                await socket.join(`state:${data.state}`);
            }

            socket.emit('cultural_preferences_updated', {
                success: true,
                preferences: socket.data.user.culturalPreferences,
                message: this.getLocalizedMessage('preferences_updated', data.language || user.culturalPreferences.language)
            });

            await this.auditService.logHealthcareEvent({
                eventType: 'cultural_preferences_updated',
                userId: user.userId,
                userType: user.userType,
                success: true,
                metadata: { updatedFields: Object.keys(data) }
            });

        } catch (error) {
            socket.emit('error', {
                code: 'UPDATE_FAILED',
                message: 'Failed to update cultural preferences',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Utility methods
    private canAccessPatientData(user: WebSocketUser, patientId: string): boolean {
        // Patient can access their own data
        if (user.userType === 'patient' && user.patientId === patientId) {
            return true;
        }

        // Healthcare providers with appropriate permissions
        if (user.userType === 'healthcare_provider' && user.permissions.includes('patient_data_access')) {
            return true;
        }

        // Admins with appropriate permissions
        if (user.userType === 'admin' && user.permissions.includes('admin_patient_access')) {
            return true;
        }

        return false;
    }

    private getLocalizedMessage(messageKey: string, language: string): string {
        const messages: Record<string, Record<string, string>> = {
            insufficient_permissions: {
                'ms': 'Anda tidak mempunyai kebenaran untuk mengakses data ini',
                'en': 'You do not have permission to access this data',
                'zh': '您没有权限访问此数据',
                'ta': 'இந்த தரவை அணுக உங்களுக்கு அனுமதி இல்லை'
            },
            vitals_subscribed: {
                'ms': 'Berjaya dilanggan kepada pemantauan tanda-tanda vital',
                'en': 'Successfully subscribed to vital signs monitoring',
                'zh': '成功订阅生命体征监测',
                'ta': 'முக்கிய அறிகுறிகள் கண்காணிப்புக்கு வெற்றிகரமாக பதிவு செய்யப்பட்டது'
            },
            emergency_subscribed: {
                'ms': 'Berjaya dilanggan kepada amaran kecemasan',
                'en': 'Successfully subscribed to emergency alerts',
                'zh': '成功订阅紧急警报',
                'ta': 'அவசர எச்சரிக்கைகளுக்கு வெற்றிகரமாக பதிவு செய்யப்பட்டது'
            },
            preferences_updated: {
                'ms': 'Keutamaan budaya berjaya dikemaskini',
                'en': 'Cultural preferences successfully updated',
                'zh': '文化偏好已成功更新',
                'ta': 'கலாச்சார விருப்பங்கள் வெற்றிகரமாக புதுப்பிக்கப்பட்டன'
            }
        };

        return messages[messageKey]?.[language] || messages[messageKey]?.['en'] || messageKey;
    }

    private async getCurrentVitalSigns(patientId: string): Promise<any> {
        try {
            const db = this.databaseService.getConnection();
            return await db.oneOrNone(`
                SELECT * FROM vital_signs 
                WHERE patient_id = $1 
                ORDER BY recorded_at DESC 
                LIMIT 1
            `, [patientId]);
        } catch (error) {
            console.error('Failed to fetch current vital signs:', error);
            return null;
        }
    }

    private async getUpcomingAppointments(user: WebSocketUser, data: any): Promise<any[]> {
        try {
            const db = this.databaseService.getConnection();
            
            let query = `
                SELECT a.*, p.name as patient_name, hp.name as provider_name
                FROM appointments a
                LEFT JOIN patients p ON a.patient_id = p.id
                LEFT JOIN healthcare_providers hp ON a.provider_id = hp.id
                WHERE a.scheduled_datetime > NOW() 
                AND a.status NOT IN ('cancelled', 'completed')
            `;
            
            const params: any[] = [];
            
            if (user.userType === 'patient') {
                query += ' AND a.patient_id = $1';
                params.push(user.patientId);
            } else if (user.userType === 'healthcare_provider') {
                query += ' AND a.provider_id = $1';
                params.push(user.providerId);
            } else if (data.patientId) {
                query += ' AND a.patient_id = $1';
                params.push(data.patientId);
            } else if (data.providerId) {
                query += ' AND a.provider_id = $1';
                params.push(data.providerId);
            }
            
            query += ' ORDER BY a.scheduled_datetime ASC LIMIT 10';
            
            return await db.manyOrNone(query, params) || [];
        } catch (error) {
            console.error('Failed to fetch upcoming appointments:', error);
            return [];
        }
    }

    private async addCulturalContextToAppointments(appointments: any[], culturalPreferences: any): Promise<any> {
        // Add prayer time awareness and cultural scheduling considerations
        return {
            prayerTimeConsiderations: culturalPreferences.prayerTimeNotifications,
            preferredLanguage: culturalPreferences.language,
            timezoneName: culturalPreferences.timezone,
            appointments: appointments.map(apt => ({
                ...apt,
                culturalNotes: {
                    prayerTimeConflict: false, // Would check against prayer times
                    ramadanConsideration: false, // Would check if during Ramadan
                    localizedTime: new Date(apt.scheduled_datetime).toLocaleString('en-US', {
                        timeZone: culturalPreferences.timezone
                    })
                }
            }))
        };
    }

    private async getMedicationScheduleWithCulturalContext(patientId: string, culturalPreferences: any): Promise<any> {
        try {
            const db = this.databaseService.getConnection();
            
            const medications = await db.manyOrNone(`
                SELECT m.*, med.name, med.halal_certified, med.cultural_considerations
                FROM medication_schedules m
                JOIN medications med ON m.medication_id = med.id
                WHERE m.patient_id = $1 AND m.status = 'active'
                ORDER BY m.scheduled_time
            `, [patientId]);

            // Filter halal medications if required
            const filteredMedications = culturalPreferences.halalMedicationOnly 
                ? medications.filter(med => med.halal_certified)
                : medications;

            return {
                patientId,
                medications: filteredMedications,
                culturalContext: {
                    halalFilterApplied: culturalPreferences.halalMedicationOnly,
                    prayerTimeAwareness: culturalPreferences.prayerTimeNotifications,
                    language: culturalPreferences.language,
                    reminders: filteredMedications.map(med => ({
                        medicationId: med.id,
                        nextReminder: med.scheduled_time,
                        culturalInstructions: this.getLocalizedMessage('take_medication', culturalPreferences.language)
                    }))
                }
            };
        } catch (error) {
            console.error('Failed to fetch medication schedule:', error);
            return { patientId, medications: [], culturalContext: {} };
        }
    }

    private async validateMessageRecipient(recipientId: string): Promise<{ type: string; id: string } | null> {
        try {
            const db = this.databaseService.getConnection();
            
            // Check if recipient is a patient
            let result = await db.oneOrNone('SELECT id FROM patients WHERE id = $1', [recipientId]);
            if (result) return { type: 'patient', id: result.id };
            
            // Check if recipient is a healthcare provider
            result = await db.oneOrNone('SELECT id FROM healthcare_providers WHERE id = $1', [recipientId]);
            if (result) return { type: 'provider', id: result.id };
            
            return null;
        } catch (error) {
            console.error('Failed to validate message recipient:', error);
            return null;
        }
    }

    private async updateUserCulturalPreferences(userId: string, preferences: any): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            
            const updateFields: string[] = [];
            const values: any[] = [userId];
            let paramCounter = 2;

            if (preferences.language) {
                updateFields.push(`language = $${paramCounter}`);
                values.push(preferences.language);
                paramCounter++;
            }

            if (preferences.state) {
                updateFields.push(`state = $${paramCounter}`);
                values.push(preferences.state);
                paramCounter++;
            }

            if (preferences.timezone) {
                updateFields.push(`timezone = $${paramCounter}`);
                values.push(preferences.timezone);
                paramCounter++;
            }

            if (typeof preferences.prayerTimeNotifications === 'boolean') {
                updateFields.push(`prayer_time_notifications = $${paramCounter}`);
                values.push(preferences.prayerTimeNotifications);
                paramCounter++;
            }

            if (typeof preferences.halalMedicationOnly === 'boolean') {
                updateFields.push(`halal_medication_only = $${paramCounter}`);
                values.push(preferences.halalMedicationOnly);
                paramCounter++;
            }

            if (updateFields.length > 0) {
                const query = `
                    UPDATE cultural_preferences 
                    SET ${updateFields.join(', ')}, updated_at = NOW()
                    WHERE user_id = $1
                `;
                await db.none(query, values);
            }
        } catch (error) {
            console.error('Failed to update cultural preferences:', error);
            throw error;
        }
    }
}

export default WebSocketHandlers;