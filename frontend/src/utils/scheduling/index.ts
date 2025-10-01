/**
 * Scheduling Utilities
 * 
 * Comprehensive utilities for Malaysian healthcare scheduling patterns,
 * cultural timing optimization, and medication schedule coordination.
 */

// Main utilities
export { default as MalaysianHealthcarePatterns } from './MalaysianHealthcarePatterns';

// Re-export types
export type {
  HealthcareProvider,
  MalaysianHealthcareTiming,
  CulturalHealthcarePractice,
  MedicationAccessPattern
} from './MalaysianHealthcarePatterns';

// Utility functions for common scheduling operations
export const schedulingUtilities = {
  /**
   * Parse time string to minutes from midnight
   */
  parseTimeToMinutes: (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  },

  /**
   * Convert minutes from midnight to time string
   */
  minutesToTimeString: (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  /**
   * Calculate time difference in minutes
   */
  getTimeDifference: (time1: string, time2: string): number => {
    const minutes1 = schedulingUtilities.parseTimeToMinutes(time1);
    const minutes2 = schedulingUtilities.parseTimeToMinutes(time2);
    return Math.abs(minutes2 - minutes1);
  },

  /**
   * Check if time falls within a time range
   */
  isTimeInRange: (time: string, startTime: string, endTime: string): boolean => {
    const timeMinutes = schedulingUtilities.parseTimeToMinutes(time);
    const startMinutes = schedulingUtilities.parseTimeToMinutes(startTime);
    const endMinutes = schedulingUtilities.parseTimeToMinutes(endTime);
    
    // Handle overnight ranges
    if (endMinutes < startMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
    
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  },

  /**
   * Add buffer time to a given time
   */
  addTimeBuffer: (time: string, bufferMinutes: number): string => {
    const minutes = schedulingUtilities.parseTimeToMinutes(time);
    return schedulingUtilities.minutesToTimeString(minutes + bufferMinutes);
  },

  /**
   * Subtract buffer time from a given time
   */
  subtractTimeBuffer: (time: string, bufferMinutes: number): string => {
    const minutes = schedulingUtilities.parseTimeToMinutes(time);
    return schedulingUtilities.minutesToTimeString(Math.max(0, minutes - bufferMinutes));
  },

  /**
   * Find optimal spacing between medication times
   */
  calculateOptimalSpacing: (
    medicationTimes: string[], 
    minimumGap: number = 60 // minutes
  ): string[] => {
    if (medicationTimes.length <= 1) return medicationTimes;

    // Sort times
    const sortedTimes = medicationTimes
      .map(time => ({
        original: time,
        minutes: schedulingUtilities.parseTimeToMinutes(time)
      }))
      .sort((a, b) => a.minutes - b.minutes);

    const optimized = [sortedTimes[0]];
    
    for (let i = 1; i < sortedTimes.length; i++) {
      const previousTime = optimized[optimized.length - 1];
      const currentTime = sortedTimes[i];
      
      // Check if minimum gap is maintained
      if (currentTime.minutes - previousTime.minutes < minimumGap) {
        // Adjust current time to maintain minimum gap
        const adjustedMinutes = previousTime.minutes + minimumGap;
        optimized.push({
          original: currentTime.original,
          minutes: adjustedMinutes
        });
      } else {
        optimized.push(currentTime);
      }
    }

    return optimized.map(t => schedulingUtilities.minutesToTimeString(t.minutes));
  },

  /**
   * Check for medication time conflicts
   */
  detectTimeConflicts: (
    medicationSchedules: Array<{
      name: string;
      times: string[];
    }>,
    conflictThreshold: number = 30 // minutes
  ): Array<{
    conflict: string;
    medications: string[];
    suggestedAdjustment: string;
  }> => {
    const conflicts: Array<{
      conflict: string;
      medications: string[];
      suggestedAdjustment: string;
    }> = [];

    const allMedicationTimes: Array<{
      medication: string;
      time: string;
      minutes: number;
    }> = [];

    // Flatten all medication times
    medicationSchedules.forEach(schedule => {
      schedule.times.forEach(time => {
        allMedicationTimes.push({
          medication: schedule.name,
          time,
          minutes: schedulingUtilities.parseTimeToMinutes(time)
        });
      });
    });

    // Sort by time
    allMedicationTimes.sort((a, b) => a.minutes - b.minutes);

    // Check for conflicts
    for (let i = 0; i < allMedicationTimes.length - 1; i++) {
      for (let j = i + 1; j < allMedicationTimes.length; j++) {
        const med1 = allMedicationTimes[i];
        const med2 = allMedicationTimes[j];
        
        const timeDiff = Math.abs(med2.minutes - med1.minutes);
        
        if (timeDiff <= conflictThreshold) {
          conflicts.push({
            conflict: `${med1.medication} at ${med1.time} conflicts with ${med2.medication} at ${med2.time}`,
            medications: [med1.medication, med2.medication],
            suggestedAdjustment: `Space medications ${conflictThreshold + 15} minutes apart`
          });
        }
      }
    }

    return conflicts;
  },

  /**
   * Generate meal-based timing suggestions
   */
  generateMealBasedTiming: (
    mealRelation: 'before' | 'with' | 'after' | 'independent',
    mealTimes: {
      breakfast: string;
      lunch: string;
      dinner: string;
    },
    bufferMinutes: number = 30
  ): string[] => {
    const timings: string[] = [];

    switch (mealRelation) {
      case 'before':
        timings.push(
          schedulingUtilities.subtractTimeBuffer(mealTimes.breakfast, bufferMinutes),
          schedulingUtilities.subtractTimeBuffer(mealTimes.lunch, bufferMinutes),
          schedulingUtilities.subtractTimeBuffer(mealTimes.dinner, bufferMinutes)
        );
        break;
      
      case 'with':
        timings.push(mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner);
        break;
      
      case 'after':
        timings.push(
          schedulingUtilities.addTimeBuffer(mealTimes.breakfast, bufferMinutes),
          schedulingUtilities.addTimeBuffer(mealTimes.lunch, bufferMinutes),
          schedulingUtilities.addTimeBuffer(mealTimes.dinner, bufferMinutes)
        );
        break;
      
      case 'independent':
        // Suggest times between meals
        timings.push('10:00', '15:00', '22:00');
        break;
    }

    return timings;
  },

  /**
   * Calculate medication adherence windows
   */
  calculateAdherenceWindows: (
    scheduledTime: string,
    flexibility: 'strict' | 'moderate' | 'flexible' = 'moderate'
  ): {
    earliest: string;
    latest: string;
    optimal: string;
    windowMinutes: number;
  } => {
    const scheduledMinutes = schedulingUtilities.parseTimeToMinutes(scheduledTime);
    let windowMinutes: number;

    switch (flexibility) {
      case 'strict':
        windowMinutes = 15; // ±15 minutes
        break;
      case 'moderate':
        windowMinutes = 30; // ±30 minutes
        break;
      case 'flexible':
        windowMinutes = 60; // ±60 minutes
        break;
    }

    return {
      earliest: schedulingUtilities.minutesToTimeString(scheduledMinutes - windowMinutes),
      latest: schedulingUtilities.minutesToTimeString(scheduledMinutes + windowMinutes),
      optimal: scheduledTime,
      windowMinutes: windowMinutes * 2
    };
  },

  /**
   * Optimize schedule for cultural considerations
   */
  optimizeForCulturalTiming: (
    medicationTimes: string[],
    culturalAvoidTimes: Array<{ start: string; end: string; reason: string }>,
    preferredTimes: string[] = []
  ): {
    optimizedTimes: string[];
    adjustments: Array<{
      original: string;
      adjusted: string;
      reason: string;
    }>;
  } => {
    const adjustments: Array<{
      original: string;
      adjusted: string;
      reason: string;
    }> = [];

    const optimizedTimes = medicationTimes.map(time => {
      // Check if time conflicts with cultural avoid times
      const conflict = culturalAvoidTimes.find(avoid =>
        schedulingUtilities.isTimeInRange(time, avoid.start, avoid.end)
      );

      if (conflict) {
        // Find nearest preferred time or safe time
        let adjustedTime = time;
        
        if (preferredTimes.length > 0) {
          // Find closest preferred time
          const timeMinutes = schedulingUtilities.parseTimeToMinutes(time);
          const closestPreferred = preferredTimes.reduce((closest, preferred) => {
            const preferredMinutes = schedulingUtilities.parseTimeToMinutes(preferred);
            const closestMinutes = schedulingUtilities.parseTimeToMinutes(closest);
            
            return Math.abs(preferredMinutes - timeMinutes) < Math.abs(closestMinutes - timeMinutes)
              ? preferred
              : closest;
          });
          
          adjustedTime = closestPreferred;
        } else {
          // Move to after the avoid period
          adjustedTime = schedulingUtilities.addTimeBuffer(conflict.end, 30);
        }

        adjustments.push({
          original: time,
          adjusted: adjustedTime,
          reason: conflict.reason
        });

        return adjustedTime;
      }

      return time;
    });

    return {
      optimizedTimes,
      adjustments
    };
  },

  /**
   * Generate reminders schedule
   */
  generateReminderSchedule: (
    medicationTime: string,
    reminderSettings: {
      advance: number; // minutes before medication time
      followup: number; // minutes after medication time
      snooze: number; // snooze interval in minutes
    } = {
      advance: 15,
      followup: 30,
      snooze: 10
    }
  ): {
    advance: string;
    medication: string;
    followup: string;
    snoozeOptions: string[];
  } => {
    const medicationMinutes = schedulingUtilities.parseTimeToMinutes(medicationTime);
    
    return {
      advance: schedulingUtilities.minutesToTimeString(medicationMinutes - reminderSettings.advance),
      medication: medicationTime,
      followup: schedulingUtilities.minutesToTimeString(medicationMinutes + reminderSettings.followup),
      snoozeOptions: [
        schedulingUtilities.minutesToTimeString(medicationMinutes + reminderSettings.snooze),
        schedulingUtilities.minutesToTimeString(medicationMinutes + reminderSettings.snooze * 2),
        schedulingUtilities.minutesToTimeString(medicationMinutes + reminderSettings.snooze * 3)
      ]
    };
  }
};

// Singleton instance
export const malaysianHealthcarePatterns = MalaysianHealthcarePatterns.getInstance();

export default {
  MalaysianHealthcarePatterns,
  malaysianHealthcarePatterns,
  schedulingUtilities
};