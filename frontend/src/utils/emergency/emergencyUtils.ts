/**
 * Emergency Utilities
 *
 * Utility functions for emergency detection, quick dial, and response tracking:
 * - Quick dial emergency contacts with <2 second response time
 * - Emergency response tracking and analytics
 * - Location services for emergency situations
 * - Emergency contact validation and optimization
 * - Cultural emergency timing utilities
 */

import { Linking, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyEvent, EmergencyResponse } from '../../services/emergency/EmergencyEngine';
import { MalaysianEmergencyContact } from '../../services/emergency/CulturalEmergencyHandler';
import type { SupportedLanguage } from '@/i18n/translations';

export interface QuickDialContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  priority: number;
  isEmergencyContact: boolean;
  culturalRole?: string;
  lastDialed?: Date;
  responseHistory: {
    totalCalls: number;
    successfulContact: number;
    averageResponseTime: number; // seconds
    lastResponse?: Date;
  };
}

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  address?: string;
  isEmergencyLocation?: boolean;
}

export interface EmergencyDialResult {
  success: boolean;
  contactId: string;
  dialedAt: Date;
  method: 'voice' | 'sms' | 'whatsapp';
  error?: string;
  responseTime?: number; // milliseconds from dial to answer
}

export interface EmergencyResponseMetrics {
  emergencyId: string;
  totalResponseTime: number; // milliseconds from detection to resolution
  escalationLevelsUsed: number;
  familyEngagement: {
    contactsNotified: number;
    contactsResponded: number;
    averageResponseTime: number;
    primaryResponder?: string;
  };
  culturalCompliance: {
    respectedPrayerTimes: boolean;
    usedCulturalLanguage: boolean;
    followedFamilyHierarchy: boolean;
    satisfiedPrivacyNorms: boolean;
  };
  emergencyResolution: {
    resolvedBy: 'patient' | 'family' | 'system' | 'emergency_services';
    resolutionMethod: string;
    requiresFollowUp: boolean;
  };
}

export interface EmergencyContactOptimization {
  contactId: string;
  optimizationSuggestions: {
    preferredContactTime: string[];
    mostReliableMethod: 'voice' | 'sms' | 'whatsapp';
    averageResponseDelay: number;
    culturalPreferences: string[];
    familyCoordinationRole: string;
  };
  performanceMetrics: {
    responseRate: number; // percentage
    emergencyReliability: number; // 1-10 scale
    culturalAppropriatenesss: number; // 1-10 scale
  };
}

/**
 * Quick Dial Emergency Contact with <2 second target response time
 */
export async function quickDialEmergencyContact(
  contact: QuickDialContact,
  method: 'voice' | 'sms' | 'whatsapp' = 'voice',
  emergencyContext?: {
    emergencyId: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    message?: string;
  }
): Promise<EmergencyDialResult> {
  const dialStartTime = Date.now();

  try {
    console.log(`Quick dialing ${contact.name} (${contact.phoneNumber}) via ${method}`);

    let dialUrl: string;
    let actualMethod = method;

    switch (method) {
      case 'voice':
        dialUrl = `tel:${contact.phoneNumber}`;
        break;

      case 'sms':
        const smsMessage = emergencyContext?.message ||
          'Emergency: Please respond immediately. Patient may need assistance.';
        dialUrl = Platform.OS === 'ios'
          ? `sms:${contact.phoneNumber}&body=${encodeURIComponent(smsMessage)}`
          : `sms:${contact.phoneNumber}?body=${encodeURIComponent(smsMessage)}`;
        break;

      case 'whatsapp':
        const whatsappMessage = emergencyContext?.message ||
          'Emergency: Please respond immediately. Patient may need assistance.';
        dialUrl = `whatsapp://send?phone=${contact.phoneNumber}&text=${encodeURIComponent(whatsappMessage)}`;

        // Fallback to SMS if WhatsApp not available
        const canOpenWhatsApp = await Linking.canOpenURL(dialUrl);
        if (!canOpenWhatsApp) {
          actualMethod = 'sms';
          dialUrl = Platform.OS === 'ios'
            ? `sms:${contact.phoneNumber}&body=${encodeURIComponent(whatsappMessage)}`
            : `sms:${contact.phoneNumber}?body=${encodeURIComponent(whatsappMessage)}`;
        }
        break;

      default:
        throw new Error(`Unsupported dial method: ${method}`);
    }

    // Attempt to open the URL
    const canOpen = await Linking.canOpenURL(dialUrl);
    if (!canOpen) {
      throw new Error(`Cannot open URL for ${actualMethod}: ${dialUrl}`);
    }

    await Linking.openURL(dialUrl);
    const responseTime = Date.now() - dialStartTime;

    // Update contact history
    await updateContactDialHistory(contact.id, actualMethod, true, responseTime);

    // Track emergency dial if context provided
    if (emergencyContext) {
      await trackEmergencyDial(emergencyContext.emergencyId, contact.id, actualMethod, responseTime);
    }

    const result: EmergencyDialResult = {
      success: true,
      contactId: contact.id,
      dialedAt: new Date(),
      method: actualMethod,
      responseTime
    };

    console.log(`Successfully dialed ${contact.name} in ${responseTime}ms via ${actualMethod}`);
    return result;

  } catch (error) {
    const responseTime = Date.now() - dialStartTime;
    console.error(`Failed to dial ${contact.name}:`, error);

    // Update contact history with failure
    await updateContactDialHistory(contact.id, method, false, responseTime);

    return {
      success: false,
      contactId: contact.id,
      dialedAt: new Date(),
      method,
      error: error instanceof Error ? error.message : 'Unknown dial error',
      responseTime
    };
  }
}

/**
 * Get current location for emergency services
 */
export async function getCurrentEmergencyLocation(): Promise<EmergencyLocation | null> {
  try {
    // Check if location services are available
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this device');
      return null;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: EmergencyLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          };

          // Try to get address from coordinates
          try {
            const address = await reverseGeocode(location.latitude, location.longitude);
            location.address = address;
          } catch (error) {
            console.warn('Failed to get address from coordinates:', error);
          }

          resolve(location);
        },
        (error) => {
          console.error('Failed to get current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds timeout
          maximumAge: 60000 // Accept cached location up to 1 minute old
        }
      );
    });

  } catch (error) {
    console.error('Failed to get emergency location:', error);
    return null;
  }
}

/**
 * Track emergency response metrics
 */
export async function trackEmergencyResponse(
  emergencyEvent: EmergencyEvent,
  response: EmergencyResponse
): Promise<void> {
  try {
    const responseData = {
      emergencyId: emergencyEvent.id,
      responseId: response.id,
      responderId: response.responderId,
      responderType: response.responderType,
      responseType: response.responseType,
      responseTime: Date.now() - emergencyEvent.responseTracking.escalationStartedAt.getTime(),
      timestamp: response.timestamp,
      location: response.location
    };

    // Store response tracking data
    const existingData = await AsyncStorage.getItem('emergency_response_tracking');
    const trackingData = existingData ? JSON.parse(existingData) : {};

    if (!trackingData[emergencyEvent.id]) {
      trackingData[emergencyEvent.id] = {
        emergencyStart: emergencyEvent.responseTracking.escalationStartedAt,
        responses: []
      };
    }

    trackingData[emergencyEvent.id].responses.push(responseData);
    await AsyncStorage.setItem('emergency_response_tracking', JSON.stringify(trackingData));

    console.log(`Tracked emergency response for ${emergencyEvent.id}: ${response.responseType}`);

  } catch (error) {
    console.error('Failed to track emergency response:', error);
  }
}

/**
 * Calculate emergency response metrics
 */
export async function calculateEmergencyMetrics(
  emergencyEvent: EmergencyEvent
): Promise<EmergencyResponseMetrics> {
  try {
    const startTime = emergencyEvent.responseTracking.escalationStartedAt.getTime();
    const endTime = emergencyEvent.resolvedAt?.getTime() || Date.now();
    const totalResponseTime = endTime - startTime;

    // Calculate family engagement metrics
    const familyEngagement = {
      contactsNotified: emergencyEvent.familyCoordination.notifiedMembers.length,
      contactsResponded: emergencyEvent.responseTracking.responses.filter(
        r => r.responderType === 'family'
      ).length,
      averageResponseTime: 0,
      primaryResponder: emergencyEvent.responseTracking.responses[0]?.responderId
    };

    if (familyEngagement.contactsResponded > 0) {
      const responseTimes = emergencyEvent.responseTracking.responses
        .filter(r => r.responderType === 'family')
        .map(r => r.timestamp.getTime() - startTime);

      familyEngagement.averageResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }

    // Assess cultural compliance
    const culturalCompliance = {
      respectedPrayerTimes: true, // Would check actual implementation
      usedCulturalLanguage: true, // Would check message languages used
      followedFamilyHierarchy: true, // Would check notification order
      satisfiedPrivacyNorms: true // Would check privacy settings compliance
    };

    // Determine resolution details
    const emergencyResolution = {
      resolvedBy: emergencyEvent.resolvedBy?.type || 'system',
      resolutionMethod: emergencyEvent.responseTracking.responses[0]?.responseType || 'timeout',
      requiresFollowUp: emergencyEvent.triggerCondition.severity === 'critical' ||
                       emergencyEvent.analytics.escalationLevelsTriggered > 3
    };

    const metrics: EmergencyResponseMetrics = {
      emergencyId: emergencyEvent.id,
      totalResponseTime,
      escalationLevelsUsed: emergencyEvent.analytics.escalationLevelsTriggered,
      familyEngagement,
      culturalCompliance,
      emergencyResolution
    };

    // Store metrics for analytics
    await storeEmergencyMetrics(metrics);

    return metrics;

  } catch (error) {
    console.error('Failed to calculate emergency metrics:', error);
    throw error;
  }
}

/**
 * Optimize emergency contact based on historical performance
 */
export async function optimizeEmergencyContact(
  contactId: string,
  emergencyHistory: EmergencyEvent[]
): Promise<EmergencyContactOptimization> {
  try {
    // Analyze contact's performance across emergencies
    const contactResponses = emergencyHistory.flatMap(emergency =>
      emergency.responseTracking.responses.filter(response =>
        response.responderId === contactId
      )
    );

    if (contactResponses.length === 0) {
      throw new Error(`No response history found for contact ${contactId}`);
    }

    // Calculate response rate
    const totalEmergenciesNotified = emergencyHistory.filter(emergency =>
      emergency.familyCoordination.notifiedMembers.includes(contactId) ||
      emergency.familyCoordination.emergencyContacts.some(ec => ec.id === contactId)
    ).length;

    const responseRate = totalEmergenciesNotified > 0
      ? (contactResponses.length / totalEmergenciesNotified) * 100
      : 0;

    // Analyze response patterns
    const responseTimes = contactResponses.map(response => {
      const emergency = emergencyHistory.find(e =>
        e.responseTracking.responses.includes(response)
      );
      return emergency
        ? response.timestamp.getTime() - emergency.responseTracking.escalationStartedAt.getTime()
        : 0;
    });

    const averageResponseDelay = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Determine preferred contact methods and times
    const methodCounts = { voice: 0, sms: 0, whatsapp: 0 };
    const timeCounts: Record<string, number> = {};

    contactResponses.forEach(response => {
      // Would analyze actual contact methods and times used
      // For demo, using mock data
      const hour = response.timestamp.getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      timeCounts[timeSlot] = (timeCounts[timeSlot] || 0) + 1;
    });

    const preferredContactTime = Object.entries(timeCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([time]) => time)
      .slice(0, 2);

    const optimization: EmergencyContactOptimization = {
      contactId,
      optimizationSuggestions: {
        preferredContactTime,
        mostReliableMethod: 'voice', // Would analyze actual success rates
        averageResponseDelay: averageResponseDelay / 1000, // Convert to seconds
        culturalPreferences: ['respect_prayer_times', 'use_formal_language'],
        familyCoordinationRole: 'primary_responder' // Would determine from response patterns
      },
      performanceMetrics: {
        responseRate,
        emergencyReliability: Math.min(10, Math.max(1, (responseRate / 10) +
          (10 - (averageResponseDelay / 60000)))), // 1-10 scale
        culturalAppropriatenesss: 8 // Would calculate based on cultural compliance
      }
    };

    return optimization;

  } catch (error) {
    console.error('Failed to optimize emergency contact:', error);
    throw error;
  }
}

/**
 * Check if current time is appropriate for emergency contact
 */
export function isEmergencyContactTimeAppropriate(
  contact: MalaysianEmergencyContact,
  currentTime: Date = new Date(),
  emergencyUrgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): {
  isAppropriate: boolean;
  reason?: string;
  suggestedDelay?: number; // minutes
  alternativeMethod?: string;
} {
  try {
    // Critical emergencies always override timing
    if (emergencyUrgency === 'critical') {
      return { isAppropriate: true };
    }

    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();

    // Check late night restrictions (23:00-06:00)
    if ((hour >= 23 || hour < 6) && emergencyUrgency !== 'high') {
      const suggestedDelay = hour >= 23
        ? (6 + 24 - hour) * 60 - minute
        : (6 - hour) * 60 - minute;

      return {
        isAppropriate: false,
        reason: 'Late night hours - respect sleep time',
        suggestedDelay,
        alternativeMethod: 'sms'
      };
    }

    // Check prayer time restrictions
    if (contact.culturalConstraints.contactTimeRestrictions.includes('avoid_prayer_times')) {
      const prayerTimes = {
        fajr: { start: 5, end: 6 },
        dhuhr: { start: 13, end: 14 },
        asr: { start: 16, end: 17 },
        maghrib: { start: 19, end: 20 },
        isha: { start: 20, end: 21 }
      };

      for (const [prayerName, times] of Object.entries(prayerTimes)) {
        if (hour >= times.start && hour < times.end) {
          return {
            isAppropriate: false,
            reason: `${prayerName} prayer time`,
            suggestedDelay: (times.end - hour) * 60 - minute,
            alternativeMethod: 'sms'
          };
        }
      }
    }

    // Check Friday prayer restrictions (12:00-14:00 on Fridays)
    if (currentTime.getDay() === 5 && hour >= 12 && hour < 14) {
      return {
        isAppropriate: false,
        reason: 'Friday prayers',
        suggestedDelay: (14 - hour) * 60 - minute,
        alternativeMethod: 'sms'
      };
    }

    return { isAppropriate: true };

  } catch (error) {
    console.error('Failed to check contact time appropriateness:', error);
    return { isAppropriate: true }; // Default to allowing contact on error
  }
}

/**
 * Format emergency dial number for Malaysian context
 */
export function formatEmergencyNumber(phoneNumber: string): string {
  try {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    // Handle Malaysian numbers
    if (digitsOnly.startsWith('60')) {
      // International format with country code
      return `+${digitsOnly}`;
    } else if (digitsOnly.startsWith('0')) {
      // Local format - convert to international
      return `+6${digitsOnly}`;
    } else if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      // Mobile number without leading 0
      return `+60${digitsOnly}`;
    }

    // Return as-is if format not recognized
    return phoneNumber;

  } catch (error) {
    console.error('Failed to format emergency number:', error);
    return phoneNumber;
  }
}

/**
 * Private helper functions
 */

async function updateContactDialHistory(
  contactId: string,
  method: string,
  success: boolean,
  responseTime: number
): Promise<void> {
  try {
    const key = 'emergency_dial_history';
    const existing = await AsyncStorage.getItem(key);
    const history = existing ? JSON.parse(existing) : {};

    if (!history[contactId]) {
      history[contactId] = {
        totalDials: 0,
        successfulDials: 0,
        lastDialed: null,
        averageResponseTime: 0,
        methodStats: {}
      };
    }

    const contactHistory = history[contactId];
    contactHistory.totalDials++;
    contactHistory.lastDialed = new Date().toISOString();

    if (success) {
      contactHistory.successfulDials++;
      // Update average response time
      const newAverage = ((contactHistory.averageResponseTime * (contactHistory.successfulDials - 1)) + responseTime) / contactHistory.successfulDials;
      contactHistory.averageResponseTime = newAverage;
    }

    // Update method statistics
    if (!contactHistory.methodStats[method]) {
      contactHistory.methodStats[method] = { attempts: 0, successes: 0 };
    }
    contactHistory.methodStats[method].attempts++;
    if (success) {
      contactHistory.methodStats[method].successes++;
    }

    await AsyncStorage.setItem(key, JSON.stringify(history));

  } catch (error) {
    console.error('Failed to update contact dial history:', error);
  }
}

async function trackEmergencyDial(
  emergencyId: string,
  contactId: string,
  method: string,
  responseTime: number
): Promise<void> {
  try {
    const key = 'emergency_dial_tracking';
    const existing = await AsyncStorage.getItem(key);
    const tracking = existing ? JSON.parse(existing) : {};

    if (!tracking[emergencyId]) {
      tracking[emergencyId] = {
        dials: []
      };
    }

    tracking[emergencyId].dials.push({
      contactId,
      method,
      responseTime,
      timestamp: new Date().toISOString()
    });

    await AsyncStorage.setItem(key, JSON.stringify(tracking));

  } catch (error) {
    console.error('Failed to track emergency dial:', error);
  }
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    // In a real implementation, this would use a geocoding service
    // For demo purposes, return a mock address
    return `Emergency Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch (error) {
    console.error('Failed to reverse geocode:', error);
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

async function storeEmergencyMetrics(metrics: EmergencyResponseMetrics): Promise<void> {
  try {
    const key = 'emergency_metrics_history';
    const existing = await AsyncStorage.getItem(key);
    const history = existing ? JSON.parse(existing) : [];

    history.push({
      ...metrics,
      calculatedAt: new Date().toISOString()
    });

    // Keep only last 100 metrics
    const trimmedHistory = history.slice(-100);
    await AsyncStorage.setItem(key, JSON.stringify(trimmedHistory));

  } catch (error) {
    console.error('Failed to store emergency metrics:', error);
  }
}

/**
 * Get emergency contact quick dial list
 */
export async function getQuickDialContacts(patientId: string): Promise<QuickDialContact[]> {
  try {
    const key = `quick_dial_contacts_${patientId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }

    // Return default emergency contacts if none stored
    return [
      {
        id: 'emergency_999',
        name: 'Emergency Services (999)',
        phoneNumber: '999',
        relationship: 'emergency_services',
        priority: 10,
        isEmergencyContact: true,
        responseHistory: {
          totalCalls: 0,
          successfulContact: 0,
          averageResponseTime: 0
        }
      }
    ];

  } catch (error) {
    console.error('Failed to get quick dial contacts:', error);
    return [];
  }
}

/**
 * Update quick dial contacts
 */
export async function updateQuickDialContacts(
  patientId: string,
  contacts: QuickDialContact[]
): Promise<void> {
  try {
    const key = `quick_dial_contacts_${patientId}`;
    await AsyncStorage.setItem(key, JSON.stringify(contacts));
  } catch (error) {
    console.error('Failed to update quick dial contacts:', error);
  }
}

export default {
  quickDialEmergencyContact,
  getCurrentEmergencyLocation,
  trackEmergencyResponse,
  calculateEmergencyMetrics,
  optimizeEmergencyContact,
  isEmergencyContactTimeAppropriate,
  formatEmergencyNumber,
  getQuickDialContacts,
  updateQuickDialContacts
};