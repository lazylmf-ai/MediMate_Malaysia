/**
 * Prayer Integration Components
 *
 * Centralized export for all prayer time integration components
 */

export { PrayerTimeIntegration } from './PrayerTimeIntegration';
export type { PrayerTimeIntegrationProps } from './PrayerTimeIntegration';

// Re-export prayer time service types for convenience
export type {
  PrayerTimes,
  PrayerTimeCalculationParams,
  MedicationSchedulingWindow,
  PrayerConflict
} from '../../../services/prayer-scheduling/PrayerTimeService';