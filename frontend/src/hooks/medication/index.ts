/**
 * Medication Hooks Export
 * 
 * Centralized export for all medication management hooks
 * providing scheduling, entry, reminders, and cultural awareness functionality.
 */

export { default as useMedicationScheduling } from './useMedicationScheduling';
export { default as useMedicationEntry } from './useMedicationEntry';
export { default as useMedicationReminders } from './useMedicationReminders';

// Re-export hook types for convenience
export type {
  MedicationSchedulingState,
  SchedulingOptions,
  SchedulingRecommendation,
} from './useMedicationScheduling';

export type {
  MedicationFormData,
  ValidationResult,
  EntryState,
} from './useMedicationEntry';

export type {
  ReminderSettings,
  ScheduledReminder,
  ReminderNotification,
  RemindersState,
} from './useMedicationReminders';