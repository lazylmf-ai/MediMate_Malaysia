/**
 * Medication Reminders Hook
 * 
 * Hook for medication reminder functionality with:
 * - Basic reminder notifications using existing push notification infrastructure
 * - Cultural-aware reminder timing (prayer times, meal times)
 * - Adherence tracking integration
 * - Flexible reminder patterns
 * - User preference management
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/medicationSlice';
import {
  Medication,
  MedicationSchedule,
  AdherenceRecord,
} from '../../types/medication';

// Reminder-related interfaces
interface ReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminderMinutesBefore: number;
  snoozeMinutes: number;
  maxSnoozeCount: number;
  quietHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    enabled: boolean;
  };
}

interface ScheduledReminder {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // ISO string
  status: 'pending' | 'sent' | 'acknowledged' | 'snoozed' | 'missed';
  snoozeCount: number;
  createdAt: string;
}

interface ReminderNotification {
  id: string;
  medicationId: string;
  title: string;
  body: string;
  data: {
    medicationName: string;
    scheduledTime: string;
    dosage: string;
    instructions?: string;
    culturalNotes?: string[];
  };
  scheduledFor: string;
  culturalContext?: {
    avoidPrayerTime: boolean;
    ramadanAdjusted: boolean;
    language: 'ms' | 'en' | 'zh' | 'ta';
  };
}

interface RemindersState {
  settings: ReminderSettings;
  scheduledReminders: ScheduledReminder[];
  activeNotifications: ReminderNotification[];
  adherenceRecords: AdherenceRecord[];
  isLoading: boolean;
  error: string | null;
}

export const useMedicationReminders = () => {
  const dispatch = useAppDispatch();
  const culturalPreferences = useAppSelector(selectCulturalPreferences);

  const [state, setState] = useState<RemindersState>({
    settings: {
      enabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      reminderMinutesBefore: 5,
      snoozeMinutes: 10,
      maxSnoozeCount: 3,
      quietHours: {
        start: '22:00',
        end: '07:00',
        enabled: true,
      },
    },
    scheduledReminders: [],
    activeNotifications: [],
    adherenceRecords: [],
    isLoading: false,
    error: null,
  });

  // Schedule reminders for a medication
  const scheduleReminders = useCallback((
    medication: Medication
  ): ScheduledReminder[] => {
    if (!medication.schedule.reminders) {
      return [];
    }

    const reminders: ScheduledReminder[] = [];
    const today = new Date();
    
    // Schedule reminders for the next 7 days
    for (let day = 0; day < 7; day++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + day);
      
      medication.schedule.times.forEach((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date(targetDate);
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Skip past times for today
        if (day === 0 && scheduledTime <= today) {
          return;
        }
        
        // Apply cultural adjustments
        const adjustedTime = applyCulturalAdjustments(
          scheduledTime,
          medication.schedule.culturalAdjustments
        );
        
        const reminder: ScheduledReminder = {
          id: `${medication.id}_${adjustedTime.toISOString()}`,
          medicationId: medication.id,
          medicationName: medication.name,
          scheduledTime: adjustedTime.toISOString(),
          status: 'pending',
          snoozeCount: 0,
          createdAt: new Date().toISOString(),
        };
        
        reminders.push(reminder);
      });
    }

    setState(prev => ({
      ...prev,
      scheduledReminders: [
        ...prev.scheduledReminders.filter(r => r.medicationId !== medication.id),
        ...reminders,
      ],
    }));

    return reminders;
  }, []);

  // Apply cultural adjustments to reminder time
  const applyCulturalAdjustments = useCallback((
    scheduledTime: Date,
    culturalAdjustments: Medication['schedule']['culturalAdjustments']
  ): Date => {
    let adjustedTime = new Date(scheduledTime);
    
    // Prayer time buffer adjustments
    if (culturalPreferences.observesPrayerTimes && culturalAdjustments.prayerTimeBuffer > 0) {
      // In a real implementation, this would check against actual prayer times
      // For now, we'll apply a simple buffer around common prayer times
      const prayerTimes = ['06:00', '13:15', '16:30', '19:20', '20:35'];
      const reminderTime = `${adjustedTime.getHours().toString().padStart(2, '0')}:${adjustedTime.getMinutes().toString().padStart(2, '0')}`;
      
      prayerTimes.forEach(prayerTime => {
        const timeDiff = Math.abs(timeToMinutes(reminderTime) - timeToMinutes(prayerTime));
        
        if (timeDiff < culturalAdjustments.prayerTimeBuffer) {
          // Adjust time to avoid prayer time
          adjustedTime.setMinutes(
            adjustedTime.getMinutes() + culturalAdjustments.prayerTimeBuffer
          );
        }
      });
    }
    
    // Ramadan adjustments
    if (culturalPreferences.observesRamadan && culturalAdjustments.ramadanSchedule) {
      const ramadanTime = culturalAdjustments.ramadanSchedule[0];
      if (ramadanTime) {
        const [hours, minutes] = ramadanTime.split(':').map(Number);
        adjustedTime.setHours(hours, minutes, 0, 0);
      }
    }
    
    return adjustedTime;
  }, [culturalPreferences]);

  // Create reminder notification
  const createReminderNotification = useCallback((
    medication: Medication,
    scheduledTime: Date
  ): ReminderNotification => {
    const dosageText = `${medication.dosage.amount}${medication.dosage.unit}`;
    
    // Generate culturally appropriate notification text
    let title: string;
    let body: string;
    
    if (culturalPreferences.language === 'ms') {
      title = `Masa untuk ubat ${medication.name}`;
      body = `Ambil ${dosageText} sekarang`;
    } else {
      title = `Time for ${medication.name}`;
      body = `Take ${dosageText} now`;
    }
    
    // Add cultural notes
    const culturalNotes: string[] = [];
    
    if (medication.cultural.takeWithFood) {
      culturalNotes.push(
        culturalPreferences.language === 'ms' 
          ? 'Ambil bersama makanan' 
          : 'Take with food'
      );
    }
    
    if (culturalPreferences.observesRamadan && medication.cultural.avoidDuringFasting) {
      culturalNotes.push(
        culturalPreferences.language === 'ms'
          ? 'Periksa jadual puasa'
          : 'Check fasting schedule'
      );
    }

    return {
      id: `notification_${medication.id}_${scheduledTime.toISOString()}`,
      medicationId: medication.id,
      title,
      body,
      data: {
        medicationName: medication.name,
        scheduledTime: scheduledTime.toISOString(),
        dosage: dosageText,
        instructions: medication.dosage.instructions,
        culturalNotes,
      },
      scheduledFor: scheduledTime.toISOString(),
      culturalContext: {
        avoidPrayerTime: culturalPreferences.observesPrayerTimes,
        ramadanAdjusted: culturalPreferences.observesRamadan,
        language: culturalPreferences.language,
      },
    };
  }, [culturalPreferences]);

  // Send reminder notification
  const sendReminderNotification = useCallback(async (
    notification: ReminderNotification
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check quiet hours
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (state.settings.quietHours.enabled && 
          isInQuietHours(currentTime, state.settings.quietHours)) {
        // Delay notification until quiet hours end
        const delayedTime = new Date(now);
        const [endHours, endMinutes] = state.settings.quietHours.end.split(':').map(Number);
        delayedTime.setHours(endHours, endMinutes, 0, 0);
        
        if (delayedTime <= now) {
          delayedTime.setDate(delayedTime.getDate() + 1);
        }
        
        // In a real implementation, reschedule the notification
        console.log('Notification delayed due to quiet hours');
      }
      
      // In a real implementation, this would use Expo Notifications
      // For now, we'll simulate the notification
      console.log('Sending notification:', notification);
      
      // Update reminder status
      setState(prev => ({
        ...prev,
        scheduledReminders: prev.scheduledReminders.map(reminder =>
          reminder.id === `${notification.medicationId}_${notification.scheduledFor}`
            ? { ...reminder, status: 'sent' }
            : reminder
        ),
        activeNotifications: [...prev.activeNotifications, notification],
        isLoading: false,
      }));
      
      return { success: true };
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send notification',
        isLoading: false,
      }));
      
      return { success: false, error: state.error || 'Failed to send notification' };
    }
  }, [state.settings]);

  // Handle reminder acknowledgment
  const acknowledgeReminder = useCallback((
    reminderId: string,
    takenAt?: Date
  ): AdherenceRecord => {
    const reminder = state.scheduledReminders.find(r => r.id === reminderId);
    
    if (!reminder) {
      throw new Error('Reminder not found');
    }
    
    const adherenceRecord: AdherenceRecord = {
      medicationId: reminder.medicationId,
      scheduledTime: reminder.scheduledTime,
      actualTime: (takenAt || new Date()).toISOString(),
      status: 'taken',
      method: 'reminder_response',
      notes: undefined,
    };
    
    setState(prev => ({
      ...prev,
      scheduledReminders: prev.scheduledReminders.map(r =>
        r.id === reminderId ? { ...r, status: 'acknowledged' } : r
      ),
      activeNotifications: prev.activeNotifications.filter(n => 
        n.id !== `notification_${reminder.medicationId}_${reminder.scheduledTime}`
      ),
      adherenceRecords: [...prev.adherenceRecords, adherenceRecord],
    }));
    
    return adherenceRecord;
  }, [state.scheduledReminders]);

  // Snooze reminder
  const snoozeReminder = useCallback((reminderId: string): boolean => {
    const reminder = state.scheduledReminders.find(r => r.id === reminderId);
    
    if (!reminder || reminder.snoozeCount >= state.settings.maxSnoozeCount) {
      return false;
    }
    
    const snoozeTime = new Date(reminder.scheduledTime);
    snoozeTime.setMinutes(snoozeTime.getMinutes() + state.settings.snoozeMinutes);
    
    setState(prev => ({
      ...prev,
      scheduledReminders: prev.scheduledReminders.map(r =>
        r.id === reminderId
          ? {
              ...r,
              scheduledTime: snoozeTime.toISOString(),
              status: 'snoozed',
              snoozeCount: r.snoozeCount + 1,
            }
          : r
      ),
    }));
    
    return true;
  }, [state.scheduledReminders, state.settings]);

  // Update reminder settings
  const updateReminderSettings = useCallback((
    updates: Partial<ReminderSettings>
  ) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  // Clear all reminders for a medication
  const clearMedicationReminders = useCallback((medicationId: string) => {
    setState(prev => ({
      ...prev,
      scheduledReminders: prev.scheduledReminders.filter(r => r.medicationId !== medicationId),
      activeNotifications: prev.activeNotifications.filter(n => n.medicationId !== medicationId),
    }));
  }, []);

  // Helper functions
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isInQuietHours = (
    currentTime: string,
    quietHours: ReminderSettings['quietHours']
  ): boolean => {
    const current = timeToMinutes(currentTime);
    const start = timeToMinutes(quietHours.start);
    const end = timeToMinutes(quietHours.end);
    
    if (start <= end) {
      // Same day quiet hours (e.g., 14:00 - 16:00)
      return current >= start && current <= end;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return current >= start || current <= end;
    }
  };

  // Get upcoming reminders for today
  const getUpcomingReminders = useCallback((): ScheduledReminder[] => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    return state.scheduledReminders
      .filter(reminder => {
        const reminderTime = new Date(reminder.scheduledTime);
        return reminderTime >= now && 
               reminderTime <= endOfDay && 
               reminder.status === 'pending';
      })
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }, [state.scheduledReminders]);

  // Get missed reminders
  const getMissedReminders = useCallback((): ScheduledReminder[] => {
    const now = new Date();
    
    return state.scheduledReminders.filter(reminder => {
      const reminderTime = new Date(reminder.scheduledTime);
      return reminderTime < now && 
             reminder.status === 'pending' &&
             reminder.snoozeCount === 0;
    });
  }, [state.scheduledReminders]);

  return {
    // State
    ...state,
    culturalPreferences,

    // Actions
    scheduleReminders,
    sendReminderNotification,
    acknowledgeReminder,
    snoozeReminder,
    updateReminderSettings,
    clearMedicationReminders,

    // Utilities
    createReminderNotification,
    getUpcomingReminders,
    getMissedReminders,
    applyCulturalAdjustments,
  };
};

export default useMedicationReminders;