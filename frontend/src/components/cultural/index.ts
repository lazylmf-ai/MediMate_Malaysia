/**
 * Cultural Intelligence Components
 *
 * Centralized export for all cultural intelligence mobile interface components
 * supporting Malaysian multicultural healthcare contexts.
 */

// Prayer Time Integration Components
export {
  PrayerTimeIntegration,
  type PrayerTimeIntegrationProps
} from './prayer';

// Multi-Language Interface Components
export {
  LanguageSwitcher,
  CulturalFormatter,
  FormattedDate,
  FormattedNumber,
  FormattedTime,
  FormattedCulturalEvent,
  type LanguageSwitcherProps,
  type CulturalFormatterProps,
  type FormattedDateProps,
  type FormattedNumberProps,
  type FormattedTimeProps,
  type FormattedCulturalEventProps
} from './language';

// Cultural Scheduling Engine Components
export {
  CulturalSchedulingInterface,
  type CulturalSchedulingInterfaceProps
} from './scheduling';

// Festival Calendar Components (re-export existing)
export {
  FestivalCalendar,
  FestivalMedicationImpact,
  RamadanScheduleAdjustment
} from './calendar';

// Other existing cultural components
export { CulturalInsights } from './CulturalInsights';
export { LocationBasedDefaults } from './LocationBasedDefaults';
export { FamilyStructureEnhanced } from './FamilyStructureEnhanced';