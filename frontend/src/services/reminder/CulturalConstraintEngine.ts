/**
 * Cultural Constraint Evaluation Engine
 * 
 * Advanced engine for Issue #24 Stream A that evaluates and applies cultural constraints
 * in real-time for medication reminders. Integrates with existing prayer time services
 * and cultural scheduling engine to provide intelligent constraint evaluation.
 * 
 * Features:
 * - Real-time prayer time constraint evaluation
 * - Ramadan fasting period adjustments
 * - Cultural quiet hours management
 * - Location-based constraint adaptation
 * - Smart fallback strategies
 * - Constraint caching and optimization
 */

import { Location } from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import PrayerSchedulingService from '../prayer-scheduling/PrayerSchedulingService';
import { PrayerTimes } from '../prayer-scheduling/PrayerTimeService';
import { culturalService } from '../../api/services/culturalService';
import { reminderDatabase, CulturalConstraintCacheRecord } from '../../models/ReminderDatabase';
import { cacheService } from '../cache/cacheService';

import { 
  EnhancedCulturalProfile, 
  MalaysianState,
  MALAYSIAN_STATES_DATA 
} from '../../types/cultural';

export interface CulturalConstraint {
  id: string;
  type: 'prayer_times' | 'ramadan' | 'quiet_hours' | 'meal_times' | 'custom';
  userId: string;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  constraint: {
    timeWindows: Array<{
      start: string; // HH:MM format
      end: string;   // HH:MM format
      days?: number[]; // 0-6 (Sunday-Saturday), optional
      avoidCompletely: boolean;
      bufferMinutes: number;
      fallbackBehavior: 'delay' | 'advance' | 'skip' | 'reschedule';
    }>;
    locationDependent: boolean;
    culturalContext: string[];
    userNotes?: string;
  };
  metadata: {
    source: 'prayer_service' | 'user_preference' | 'cultural_calendar' | 'system_detected';
    confidence: number; // 0-1
    lastUpdated: Date;
    autoRefresh: boolean;
    dependencies?: string[]; // IDs of other constraints this depends on
  };
}

export interface ConstraintEvaluationResult {
  canProceed: boolean;
  timeAdjustment?: {
    originalTime: Date;
    adjustedTime: Date;
    adjustmentReason: string;
    fallbackUsed: boolean;
  };
  conflictingConstraints: CulturalConstraint[];
  recommendations: string[];
  culturalContext: {
    currentPrayerStatus?: string;
    ramadanStatus?: boolean;
    quietHoursStatus?: boolean;
    mealTimeStatus?: string;
    customStatus?: Record<string, any>;
  };
  nextAvailableSlot?: Date;
}

export interface ConstraintRefreshResult {
  checked: number;
  updated: boolean;
  affectedUsers: string[];
  errors: string[];
}

export interface UserConstraintProfile {
  userId: string;
  activeConstraints: CulturalConstraint[];
  lastEvaluated: Date;
  location: {
    state: MalaysianState;
    coordinates: { latitude: number; longitude: number };
    timezone: string;
  };
  preferences: {
    strictMode: boolean;
    defaultBufferMinutes: number;
    fallbackPreference: 'delay' | 'advance' | 'skip';
    notifyOnAdjustments: boolean;
  };
}

class CulturalConstraintEngine {
  private static instance: CulturalConstraintEngine;
  private prayerSchedulingService: PrayerSchedulingService;
  private constraintCache: Map<string, CulturalConstraint[]> = new Map();
  private userProfiles: Map<string, UserConstraintProfile> = new Map();
  
  private readonly CACHE_TTL = {
    PRAYER_TIMES: 60 * 60 * 1000, // 1 hour
    RAMADAN_STATUS: 24 * 60 * 60 * 1000, // 24 hours
    USER_CONSTRAINTS: 30 * 60 * 1000, // 30 minutes
  };

  private readonly STORAGE_KEYS = {
    CONSTRAINT_CACHE: 'cultural_constraint_cache',
    USER_PROFILES: 'cultural_user_profiles',
    EVALUATION_HISTORY: 'constraint_evaluation_history',
  };

  private constructor() {
    this.prayerSchedulingService = PrayerSchedulingService.getInstance();
  }

  static getInstance(): CulturalConstraintEngine {
    if (!CulturalConstraintEngine.instance) {
      CulturalConstraintEngine.instance = new CulturalConstraintEngine();
    }
    return CulturalConstraintEngine.instance;
  }

  /**
   * Initialize the constraint engine
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Load cached constraints and user profiles
      await this.loadCachedData();
      
      // Start periodic constraint refresh
      this.startPeriodicRefresh();
      
      return { success: true };
    } catch (error) {
      console.error('Cultural constraint engine initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Evaluate cultural constraints for a specific time and user
   */
  async evaluateConstraints(
    scheduledTime: Date,
    userId: string,
    medicationContext?: {
      priority: 'low' | 'medium' | 'high' | 'critical';
      medicationType: string;
      isLifeCritical: boolean;
    }
  ): Promise<ConstraintEvaluationResult> {
    try {
      // Get user constraint profile
      const userProfile = await this.getUserConstraintProfile(userId);
      if (!userProfile) {
        return this.createDefaultEvaluationResult(scheduledTime);
      }

      const conflictingConstraints: CulturalConstraint[] = [];
      const recommendations: string[] = [];
      let adjustedTime = scheduledTime;
      let adjustmentReason = '';
      let fallbackUsed = false;

      // Evaluate each active constraint
      for (const constraint of userProfile.activeConstraints) {
        const conflict = await this.evaluateIndividualConstraint(
          scheduledTime,
          constraint,
          userProfile
        );

        if (conflict.hasConflict) {
          conflictingConstraints.push(constraint);

          // Apply adjustment based on constraint type and priority
          if (conflict.suggestedAdjustment) {
            // Use the most restrictive adjustment
            if (!adjustedTime || conflict.suggestedAdjustment.getTime() > adjustedTime.getTime()) {
              adjustedTime = conflict.suggestedAdjustment;
              adjustmentReason = conflict.reason || 'Cultural constraint adjustment';
              fallbackUsed = conflict.fallbackUsed || false;
            }
          }

          recommendations.push(...conflict.recommendations);
        }
      }

      // Determine if medication can proceed
      const canProceed = this.canProceedWithAdjustments(
        conflictingConstraints,
        medicationContext
      );

      // Get cultural context
      const culturalContext = await this.buildCulturalContext(scheduledTime, userProfile);

      // Find next available slot if current time is blocked
      const nextAvailableSlot = !canProceed ? 
        await this.findNextAvailableSlot(scheduledTime, userProfile) : 
        undefined;

      const result: ConstraintEvaluationResult = {
        canProceed,
        conflictingConstraints,
        recommendations,
        culturalContext,
        nextAvailableSlot
      };

      // Add time adjustment if applicable
      if (adjustedTime.getTime() !== scheduledTime.getTime()) {
        result.timeAdjustment = {
          originalTime: scheduledTime,
          adjustedTime,
          adjustmentReason,
          fallbackUsed
        };
      }

      // Cache evaluation result for performance
      await this.cacheEvaluationResult(userId, scheduledTime, result);

      return result;

    } catch (error) {
      console.error('Constraint evaluation failed:', error);
      return this.createDefaultEvaluationResult(scheduledTime, error);
    }
  }

  /**
   * Check and update constraints for all users
   */
  async checkAndUpdateConstraints(): Promise<ConstraintRefreshResult> {
    const result: ConstraintRefreshResult = {
      checked: 0,
      updated: false,
      affectedUsers: [],
      errors: []
    };

    try {
      const userProfiles = Array.from(this.userProfiles.values());
      
      for (const profile of userProfiles) {
        result.checked++;
        
        try {
          const constraintsUpdated = await this.refreshUserConstraints(profile.userId);
          
          if (constraintsUpdated) {
            result.updated = true;
            result.affectedUsers.push(profile.userId);
          }
        } catch (error) {
          result.errors.push(`User ${profile.userId}: ${error}`);
        }
      }

      return result;

    } catch (error) {
      console.error('Constraint refresh failed:', error);
      result.errors.push(`Global refresh error: ${error}`);
      return result;
    }
  }

  /**
   * Refresh constraints for a specific user
   */
  async refreshUserConstraints(userId: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserConstraintProfile(userId);
      if (!userProfile) return false;

      let constraintsUpdated = false;

      // Refresh prayer time constraints
      const prayerConstraintsUpdated = await this.refreshPrayerTimeConstraints(userId, userProfile);
      constraintsUpdated = constraintsUpdated || prayerConstraintsUpdated;

      // Refresh Ramadan constraints
      const ramadanConstraintsUpdated = await this.refreshRamadanConstraints(userId, userProfile);
      constraintsUpdated = constraintsUpdated || ramadanConstraintsUpdated;

      // Refresh custom constraints from cultural calendar
      const customConstraintsUpdated = await this.refreshCustomConstraints(userId, userProfile);
      constraintsUpdated = constraintsUpdated || customConstraintsUpdated;

      if (constraintsUpdated) {
        // Update user profile cache
        userProfile.lastEvaluated = new Date();
        this.userProfiles.set(userId, userProfile);
        
        // Save to database
        await this.saveUserConstraints(userId, userProfile.activeConstraints);
      }

      return constraintsUpdated;

    } catch (error) {
      console.error(`Failed to refresh constraints for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get current prayer status across all users
   */
  async getCurrentPrayerStatus(): Promise<{
    isDuringPrayer: boolean;
    currentPrayer?: string;
    affectedUsers: string[];
    nextPrayerTime?: Date;
  }> {
    try {
      const userProfiles = Array.from(this.userProfiles.values());
      let isDuringPrayer = false;
      let currentPrayer: string | undefined;
      const affectedUsers: string[] = [];
      let nextPrayerTime: Date | undefined;

      for (const profile of userProfiles) {
        // Check if user has prayer time constraints enabled
        const hasPrayerConstraints = profile.activeConstraints.some(
          c => c.type === 'prayer_times' && c.isActive
        );

        if (hasPrayerConstraints) {
          const prayerStatus = await this.prayerSchedulingService.isCurrentlyPrayerTime({
            location: profile.location
          });

          if (prayerStatus.isDuringPrayer) {
            isDuringPrayer = true;
            currentPrayer = prayerStatus.currentPrayer;
            affectedUsers.push(profile.userId);
          }

          // Track earliest next prayer time
          if (prayerStatus.timeUntilNext) {
            const nextTime = new Date(Date.now() + prayerStatus.timeUntilNext * 60 * 1000);
            if (!nextPrayerTime || nextTime < nextPrayerTime) {
              nextPrayerTime = nextTime;
            }
          }
        }
      }

      return {
        isDuringPrayer,
        currentPrayer,
        affectedUsers,
        nextPrayerTime
      };

    } catch (error) {
      console.error('Failed to get current prayer status:', error);
      return {
        isDuringPrayer: false,
        affectedUsers: []
      };
    }
  }

  /**
   * Check if it's currently quiet hours for any user
   */
  async isCurrentlyQuietHours(): Promise<boolean> {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      for (const profile of this.userProfiles.values()) {
        const quietHoursConstraint = profile.activeConstraints.find(
          c => c.type === 'quiet_hours' && c.isActive
        );

        if (quietHoursConstraint) {
          for (const timeWindow of quietHoursConstraint.constraint.timeWindows) {
            if (this.isTimeInWindow(currentTime, timeWindow.start, timeWindow.end)) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to check quiet hours status:', error);
      return false;
    }
  }

  /**
   * Create or update user constraint profile
   */
  async createUserConstraintProfile(
    userId: string,
    culturalProfile: EnhancedCulturalProfile,
    preferences?: Partial<UserConstraintProfile['preferences']>
  ): Promise<UserConstraintProfile> {
    try {
      const userProfile: UserConstraintProfile = {
        userId,
        activeConstraints: [],
        lastEvaluated: new Date(),
        location: {
          state: culturalProfile.location.state as MalaysianState,
          coordinates: culturalProfile.location.coordinates || {
            latitude: MALAYSIAN_STATES_DATA[culturalProfile.location.state]?.coordinates.latitude || 3.139,
            longitude: MALAYSIAN_STATES_DATA[culturalProfile.location.state]?.coordinates.longitude || 101.6869
          },
          timezone: 'Asia/Kuala_Lumpur'
        },
        preferences: {
          strictMode: false,
          defaultBufferMinutes: 30,
          fallbackPreference: 'delay',
          notifyOnAdjustments: true,
          ...preferences
        }
      };

      // Generate constraints based on cultural profile
      userProfile.activeConstraints = await this.generateConstraintsFromProfile(culturalProfile);

      // Cache the profile
      this.userProfiles.set(userId, userProfile);

      // Save to database
      await this.saveUserConstraints(userId, userProfile.activeConstraints);

      return userProfile;

    } catch (error) {
      console.error('Failed to create user constraint profile:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async loadCachedData(): Promise<void> {
    try {
      // Load user profiles from storage
      const profilesData = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_PROFILES);
      if (profilesData) {
        const profiles = JSON.parse(profilesData);
        for (const [userId, profile] of Object.entries(profiles)) {
          this.userProfiles.set(userId, profile as UserConstraintProfile);
        }
      }

      // Load cached constraints from database
      // This would load constraint cache records for all users
      // Implementation would query the cultural_constraint_cache table
    } catch (error) {
      console.error('Failed to load cached constraint data:', error);
    }
  }

  private startPeriodicRefresh(): void {
    // Refresh constraints every 30 minutes
    setInterval(async () => {
      try {
        await this.checkAndUpdateConstraints();
      } catch (error) {
        console.error('Periodic constraint refresh failed:', error);
      }
    }, 30 * 60 * 1000);
  }

  private async getUserConstraintProfile(userId: string): Promise<UserConstraintProfile | null> {
    try {
      // Check in-memory cache first
      let profile = this.userProfiles.get(userId);
      
      if (!profile) {
        // Load from database
        const constraints = await reminderDatabase.getCulturalConstraints(userId);
        if (constraints.length > 0) {
          // Reconstruct profile from database constraints
          // This is a simplified implementation
          profile = {
            userId,
            activeConstraints: await this.convertDbConstraintsToEngine(constraints),
            lastEvaluated: new Date(),
            location: {
              state: 'kuala_lumpur', // Would be loaded from user profile
              coordinates: { latitude: 3.139, longitude: 101.6869 },
              timezone: 'Asia/Kuala_Lumpur'
            },
            preferences: {
              strictMode: false,
              defaultBufferMinutes: 30,
              fallbackPreference: 'delay',
              notifyOnAdjustments: true
            }
          };
          
          this.userProfiles.set(userId, profile);
        }
      }
      
      return profile || null;
    } catch (error) {
      console.error(`Failed to get user constraint profile for ${userId}:`, error);
      return null;
    }
  }

  private async evaluateIndividualConstraint(
    scheduledTime: Date,
    constraint: CulturalConstraint,
    userProfile: UserConstraintProfile
  ): Promise<{
    hasConflict: boolean;
    suggestedAdjustment?: Date;
    reason?: string;
    recommendations: string[];
    fallbackUsed: boolean;
  }> {
    try {
      const timeString = `${scheduledTime.getHours().toString().padStart(2, '0')}:${scheduledTime.getMinutes().toString().padStart(2, '0')}`;
      const dayOfWeek = scheduledTime.getDay();

      for (const timeWindow of constraint.constraint.timeWindows) {
        // Check if day matches (if days are specified)
        if (timeWindow.days && !timeWindow.days.includes(dayOfWeek)) {
          continue;
        }

        // Check if time falls within restricted window
        const inWindow = this.isTimeInWindow(timeString, timeWindow.start, timeWindow.end);
        const nearWindow = this.isTimeNearWindow(
          timeString, 
          timeWindow.start, 
          timeWindow.end, 
          timeWindow.bufferMinutes
        );

        if (inWindow || nearWindow) {
          // Generate adjustment based on fallback behavior
          const adjustment = await this.generateTimeAdjustment(
            scheduledTime,
            timeWindow,
            constraint.type,
            userProfile
          );

          return {
            hasConflict: true,
            suggestedAdjustment: adjustment.adjustedTime,
            reason: adjustment.reason,
            recommendations: adjustment.recommendations,
            fallbackUsed: adjustment.fallbackUsed
          };
        }
      }

      return {
        hasConflict: false,
        recommendations: [],
        fallbackUsed: false
      };

    } catch (error) {
      console.error('Individual constraint evaluation failed:', error);
      return {
        hasConflict: false,
        recommendations: [`Error evaluating ${constraint.type} constraint`],
        fallbackUsed: false
      };
    }
  }

  private async generateTimeAdjustment(
    originalTime: Date,
    timeWindow: CulturalConstraint['constraint']['timeWindows'][0],
    constraintType: CulturalConstraint['type'],
    userProfile: UserConstraintProfile
  ): Promise<{
    adjustedTime: Date;
    reason: string;
    recommendations: string[];
    fallbackUsed: boolean;
  }> {
    const recommendations: string[] = [];
    let adjustedTime = new Date(originalTime);
    let fallbackUsed = false;

    switch (timeWindow.fallbackBehavior) {
      case 'delay':
        // Move time after the restricted window
        const endTime = this.parseTimeString(timeWindow.end);
        adjustedTime.setHours(endTime.hours, endTime.minutes + timeWindow.bufferMinutes, 0, 0);
        recommendations.push(`Delayed to after ${constraintType} period`);
        break;

      case 'advance':
        // Move time before the restricted window
        const startTime = this.parseTimeString(timeWindow.start);
        adjustedTime.setHours(startTime.hours, startTime.minutes - timeWindow.bufferMinutes, 0, 0);
        recommendations.push(`Advanced to before ${constraintType} period`);
        break;

      case 'skip':
        // Skip to next available day
        adjustedTime.setDate(adjustedTime.getDate() + 1);
        fallbackUsed = true;
        recommendations.push(`Rescheduled to next day due to ${constraintType} constraint`);
        break;

      case 'reschedule':
        // Find optimal alternative time
        const nextSlot = await this.findNextAvailableSlot(originalTime, userProfile);
        if (nextSlot) {
          adjustedTime = nextSlot;
          fallbackUsed = true;
          recommendations.push(`Rescheduled to optimal alternative time`);
        }
        break;
    }

    // Ensure adjusted time is not in the past
    if (adjustedTime <= new Date()) {
      adjustedTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      fallbackUsed = true;
      recommendations.push('Adjusted to minimum future time');
    }

    return {
      adjustedTime,
      reason: `${constraintType} constraint: ${timeWindow.fallbackBehavior}`,
      recommendations,
      fallbackUsed
    };
  }

  private canProceedWithAdjustments(
    conflictingConstraints: CulturalConstraint[],
    medicationContext?: {
      priority: 'low' | 'medium' | 'high' | 'critical';
      isLifeCritical: boolean;
    }
  ): boolean {
    // Critical medications always proceed
    if (medicationContext?.isLifeCritical || medicationContext?.priority === 'critical') {
      return true;
    }

    // Check if any constraints completely block the medication
    const blockingConstraints = conflictingConstraints.filter(
      c => c.constraint.timeWindows.some(w => w.avoidCompletely)
    );

    return blockingConstraints.length === 0;
  }

  private async buildCulturalContext(
    scheduledTime: Date,
    userProfile: UserConstraintProfile
  ): Promise<ConstraintEvaluationResult['culturalContext']> {
    const context: ConstraintEvaluationResult['culturalContext'] = {};

    try {
      // Get prayer status
      const prayerStatus = await this.prayerSchedulingService.isCurrentlyPrayerTime({
        location: userProfile.location
      });
      if (prayerStatus.isDuringPrayer) {
        context.currentPrayerStatus = prayerStatus.currentPrayer;
      }

      // Get Ramadan status
      context.ramadanStatus = await this.isCurrentlyRamadan();

      // Get quiet hours status
      context.quietHoursStatus = await this.isCurrentlyQuietHours();

      return context;
    } catch (error) {
      console.error('Failed to build cultural context:', error);
      return context;
    }
  }

  private async findNextAvailableSlot(
    originalTime: Date,
    userProfile: UserConstraintProfile
  ): Promise<Date | undefined> {
    try {
      // Start from the next hour
      let candidate = new Date(originalTime);
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);

      // Check up to 24 hours ahead
      for (let attempts = 0; attempts < 24; attempts++) {
        const evaluation = await this.evaluateConstraints(candidate, userProfile.userId);
        
        if (evaluation.canProceed && evaluation.conflictingConstraints.length === 0) {
          return candidate;
        }

        candidate.setHours(candidate.getHours() + 1);
      }

      return undefined; // No available slot found
    } catch (error) {
      console.error('Failed to find next available slot:', error);
      return undefined;
    }
  }

  private createDefaultEvaluationResult(
    scheduledTime: Date,
    error?: any
  ): ConstraintEvaluationResult {
    return {
      canProceed: true,
      conflictingConstraints: [],
      recommendations: error ? ['Error evaluating constraints - using default behavior'] : [],
      culturalContext: {}
    };
  }

  private async refreshPrayerTimeConstraints(
    userId: string,
    userProfile: UserConstraintProfile
  ): Promise<boolean> {
    try {
      // Get current prayer times
      const prayerTimes = await this.prayerSchedulingService.getCurrentPrayerTimes();
      
      // Find existing prayer time constraint
      let prayerConstraint = userProfile.activeConstraints.find(c => c.type === 'prayer_times');
      
      if (!prayerConstraint) {
        // Create new prayer time constraint
        prayerConstraint = await this.createPrayerTimeConstraint(userId, prayerTimes, userProfile);
        userProfile.activeConstraints.push(prayerConstraint);
        return true;
      } else {
        // Update existing constraint with new prayer times
        const updated = await this.updatePrayerTimeConstraint(prayerConstraint, prayerTimes);
        return updated;
      }
    } catch (error) {
      console.error('Failed to refresh prayer time constraints:', error);
      return false;
    }
  }

  private async refreshRamadanConstraints(
    userId: string,
    userProfile: UserConstraintProfile
  ): Promise<boolean> {
    try {
      const isRamadan = await this.isCurrentlyRamadan();
      
      let ramadanConstraint = userProfile.activeConstraints.find(c => c.type === 'ramadan');
      
      if (isRamadan && !ramadanConstraint) {
        // Create Ramadan constraint
        ramadanConstraint = await this.createRamadanConstraint(userId);
        userProfile.activeConstraints.push(ramadanConstraint);
        return true;
      } else if (!isRamadan && ramadanConstraint) {
        // Remove Ramadan constraint
        userProfile.activeConstraints = userProfile.activeConstraints.filter(c => c.type !== 'ramadan');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh Ramadan constraints:', error);
      return false;
    }
  }

  private async refreshCustomConstraints(
    userId: string,
    userProfile: UserConstraintProfile
  ): Promise<boolean> {
    try {
      // This would check for cultural holidays, festivals, etc.
      // For now, return false (no updates)
      return false;
    } catch (error) {
      console.error('Failed to refresh custom constraints:', error);
      return false;
    }
  }

  // Utility methods

  private isTimeInWindow(time: string, windowStart: string, windowEnd: string): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(windowStart);
    const endMinutes = this.timeToMinutes(windowEnd);

    if (startMinutes <= endMinutes) {
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    } else {
      // Window crosses midnight
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
  }

  private isTimeNearWindow(
    time: string,
    windowStart: string,
    windowEnd: string,
    bufferMinutes: number
  ): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(windowStart);
    const endMinutes = this.timeToMinutes(windowEnd);

    const expandedStart = startMinutes - bufferMinutes;
    const expandedEnd = endMinutes + bufferMinutes;

    if (expandedStart <= expandedEnd) {
      return timeMinutes >= expandedStart && timeMinutes <= expandedEnd;
    } else {
      return timeMinutes >= expandedStart || timeMinutes <= expandedEnd;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private parseTimeString(time: string): { hours: number; minutes: number } {
    const [hours, minutes] = time.split(':').map(Number);
    return { hours, minutes };
  }

  private async isCurrentlyRamadan(): Promise<boolean> {
    try {
      // This would integrate with cultural service to check Ramadan dates
      const ramadanInfo = await culturalService.isRamadanPeriod();
      return ramadanInfo.data?.isRamadan || false;
    } catch (error) {
      console.error('Failed to check Ramadan status:', error);
      return false;
    }
  }

  // Constraint creation methods

  private async generateConstraintsFromProfile(
    culturalProfile: EnhancedCulturalProfile
  ): Promise<CulturalConstraint[]> {
    const constraints: CulturalConstraint[] = [];

    // Generate prayer time constraints if enabled
    if (culturalProfile.preferences.prayerTimes?.enabled) {
      const prayerConstraint = await this.createPrayerTimeConstraintFromProfile(culturalProfile);
      constraints.push(prayerConstraint);
    }

    // Generate quiet hours constraints
    if (culturalProfile.preferences.quietHours) {
      const quietHoursConstraint = this.createQuietHoursConstraint(culturalProfile);
      constraints.push(quietHoursConstraint);
    }

    return constraints;
  }

  private async createPrayerTimeConstraintFromProfile(
    culturalProfile: EnhancedCulturalProfile
  ): Promise<CulturalConstraint> {
    const prayerTimes = await this.prayerSchedulingService.getCurrentPrayerTimes();
    
    return {
      id: `prayer_${culturalProfile.userId}_${Date.now()}`,
      type: 'prayer_times',
      userId: culturalProfile.userId,
      isActive: true,
      effectiveFrom: new Date(),
      effectiveUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      priority: 'high',
      constraint: {
        timeWindows: this.createPrayerTimeWindows(prayerTimes, culturalProfile.preferences.prayerTimes!.medicationBuffer || 30),
        locationDependent: true,
        culturalContext: ['Islamic prayer times', 'Malaysian prayer schedule'],
      },
      metadata: {
        source: 'prayer_service',
        confidence: 0.95,
        lastUpdated: new Date(),
        autoRefresh: true,
      }
    };
  }

  private createQuietHoursConstraint(culturalProfile: EnhancedCulturalProfile): CulturalConstraint {
    return {
      id: `quiet_hours_${culturalProfile.userId}_${Date.now()}`,
      type: 'quiet_hours',
      userId: culturalProfile.userId,
      isActive: true,
      effectiveFrom: new Date(),
      effectiveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      priority: 'medium',
      constraint: {
        timeWindows: [{
          start: culturalProfile.preferences.quietHours?.start || '22:00',
          end: culturalProfile.preferences.quietHours?.end || '07:00',
          avoidCompletely: false,
          bufferMinutes: 0,
          fallbackBehavior: 'delay'
        }],
        locationDependent: false,
        culturalContext: ['Quiet hours', 'Sleep period'],
      },
      metadata: {
        source: 'user_preference',
        confidence: 1.0,
        lastUpdated: new Date(),
        autoRefresh: false,
      }
    };
  }

  private createPrayerTimeWindows(
    prayerTimes: PrayerTimes,
    bufferMinutes: number
  ): CulturalConstraint['constraint']['timeWindows'] {
    const windows: CulturalConstraint['constraint']['timeWindows'] = [];

    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr },
      { name: 'dhuhr', time: prayerTimes.dhuhr },
      { name: 'asr', time: prayerTimes.asr },
      { name: 'maghrib', time: prayerTimes.maghrib },
      { name: 'isha', time: prayerTimes.isha },
    ];

    prayers.forEach(prayer => {
      const prayerTime = prayer.time;
      const startTime = new Date(prayerTime.getTime() - bufferMinutes * 60 * 1000);
      const endTime = new Date(prayerTime.getTime() + bufferMinutes * 60 * 1000);

      windows.push({
        start: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
        end: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
        avoidCompletely: false,
        bufferMinutes: 0, // Buffer already applied to window times
        fallbackBehavior: 'delay'
      });
    });

    return windows;
  }

  private async createPrayerTimeConstraint(
    userId: string,
    prayerTimes: PrayerTimes,
    userProfile: UserConstraintProfile
  ): Promise<CulturalConstraint> {
    return {
      id: `prayer_${userId}_${Date.now()}`,
      type: 'prayer_times',
      userId,
      isActive: true,
      effectiveFrom: new Date(),
      effectiveUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      priority: 'high',
      constraint: {
        timeWindows: this.createPrayerTimeWindows(prayerTimes, userProfile.preferences.defaultBufferMinutes),
        locationDependent: true,
        culturalContext: ['Prayer times'],
      },
      metadata: {
        source: 'prayer_service',
        confidence: 0.95,
        lastUpdated: new Date(),
        autoRefresh: true,
      }
    };
  }

  private async updatePrayerTimeConstraint(
    constraint: CulturalConstraint,
    prayerTimes: PrayerTimes
  ): Promise<boolean> {
    try {
      const bufferMinutes = 30; // Default buffer
      const newTimeWindows = this.createPrayerTimeWindows(prayerTimes, bufferMinutes);
      
      // Check if time windows changed
      const changed = JSON.stringify(constraint.constraint.timeWindows) !== JSON.stringify(newTimeWindows);
      
      if (changed) {
        constraint.constraint.timeWindows = newTimeWindows;
        constraint.metadata.lastUpdated = new Date();
        constraint.effectiveUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      
      return changed;
    } catch (error) {
      console.error('Failed to update prayer time constraint:', error);
      return false;
    }
  }

  private async createRamadanConstraint(userId: string): Promise<CulturalConstraint> {
    return {
      id: `ramadan_${userId}_${Date.now()}`,
      type: 'ramadan',
      userId,
      isActive: true,
      effectiveFrom: new Date(),
      effectiveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      priority: 'high',
      constraint: {
        timeWindows: [{
          start: '06:00', // Approximate fasting start
          end: '19:00',   // Approximate fasting end
          avoidCompletely: false,
          bufferMinutes: 30,
          fallbackBehavior: 'reschedule'
        }],
        locationDependent: true,
        culturalContext: ['Ramadan fasting', 'Islamic calendar'],
      },
      metadata: {
        source: 'cultural_calendar',
        confidence: 0.9,
        lastUpdated: new Date(),
        autoRefresh: true,
      }
    };
  }

  // Database operations

  private async saveUserConstraints(userId: string, constraints: CulturalConstraint[]): Promise<void> {
    try {
      for (const constraint of constraints) {
        const dbRecord: Omit<CulturalConstraintCacheRecord, 'created_at' | 'updated_at'> = {
          id: constraint.id,
          user_id: userId,
          constraint_type: constraint.type,
          constraint_data: JSON.stringify(constraint),
          effective_date: constraint.effectiveFrom.toISOString(),
          expires_at: constraint.effectiveUntil.toISOString(),
        };

        await reminderDatabase.upsertCulturalConstraint(dbRecord);
      }
    } catch (error) {
      console.error('Failed to save user constraints:', error);
    }
  }

  private async convertDbConstraintsToEngine(
    dbConstraints: CulturalConstraintCacheRecord[]
  ): Promise<CulturalConstraint[]> {
    return dbConstraints.map(dbConstraint => {
      try {
        return JSON.parse(dbConstraint.constraint_data) as CulturalConstraint;
      } catch (error) {
        console.error('Failed to parse constraint data:', error);
        // Return a default constraint
        return {
          id: dbConstraint.id,
          type: dbConstraint.constraint_type,
          userId: dbConstraint.user_id,
          isActive: false,
          effectiveFrom: new Date(dbConstraint.effective_date),
          effectiveUntil: new Date(dbConstraint.expires_at),
          priority: 'low',
          constraint: {
            timeWindows: [],
            locationDependent: false,
            culturalContext: []
          },
          metadata: {
            source: 'system_detected',
            confidence: 0,
            lastUpdated: new Date(),
            autoRefresh: false
          }
        };
      }
    });
  }

  private async cacheEvaluationResult(
    userId: string,
    scheduledTime: Date,
    result: ConstraintEvaluationResult
  ): Promise<void> {
    try {
      const cacheKey = `evaluation_${userId}_${scheduledTime.getTime()}`;
      await cacheService.set(cacheKey, result, 15 * 60 * 1000); // Cache for 15 minutes
    } catch (error) {
      console.error('Failed to cache evaluation result:', error);
    }
  }

  /**
   * Public API methods for external services
   */

  async refreshConstraints(): Promise<ConstraintRefreshResult> {
    return await this.checkAndUpdateConstraints();
  }

  async hasActiveConstraints(userId: string): Promise<boolean> {
    const profile = await this.getUserConstraintProfile(userId);
    return profile ? profile.activeConstraints.filter(c => c.isActive).length > 0 : false;
  }

  async getActiveConstraints(userId: string): Promise<CulturalConstraint[]> {
    const profile = await this.getUserConstraintProfile(userId);
    return profile ? profile.activeConstraints.filter(c => c.isActive) : [];
  }
}

export default CulturalConstraintEngine;