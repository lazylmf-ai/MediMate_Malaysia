/**
 * Malaysian Healthcare Patterns Utility
 * 
 * Comprehensive utility for Malaysian healthcare timing patterns, clinic hours,
 * pharmacy schedules, emergency services, and cultural healthcare practices.
 * Supports medication scheduling integration with Malaysian healthcare ecosystem.
 */

import { MalaysianState, MALAYSIAN_STATES_DATA } from '../../types/cultural';

export interface HealthcareProvider {
  id: string;
  name: string;
  type: 'government_clinic' | 'private_clinic' | 'government_hospital' | 'private_hospital' | 'pharmacy' | 'specialist';
  location: {
    state: MalaysianState;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  operatingHours: {
    weekdays: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string } | null;
    publicHolidays: 'closed' | 'emergency_only' | 'limited';
  };
  services: {
    emergency: boolean;
    consultation: boolean;
    pharmacy: boolean;
    laboratory: boolean;
    imaging: boolean;
    specialist: string[];
  };
  culturalServices: {
    languages: ('ms' | 'en' | 'zh' | 'ta' | 'other')[];
    culturallyTrained: boolean;
    religiousConsiderations: boolean;
    traditionalMedicine: boolean;
  };
  averageWaitTime: {
    walkIn: number; // minutes
    appointment: number; // minutes
    emergency: number; // minutes
  };
}

export interface MalaysianHealthcareTiming {
  clinicHours: {
    government: {
      weekdays: { open: string; close: string };
      saturday: { open: string; close: string };
      sunday: null;
    };
    private: {
      weekdays: { open: string; close: string };
      saturday: { open: string; close: string };
      sunday: { open: string; close: string };
    };
  };
  pharmacyHours: {
    standard: {
      weekdays: { open: string; close: string };
      saturday: { open: string; close: string };
      sunday: { open: string; close: string };
    };
    hospital: {
      available: '24/7';
    };
    guardian: {
      weekdays: { open: string; close: string };
      saturday: { open: string; close: string };
      sunday: { open: string; close: string };
    };
  };
  emergencyServices: {
    available: '24/7';
    response: {
      urban: '8-15 minutes';
      suburban: '15-25 minutes';
      rural: '25-45 minutes';
    };
  };
  appointmentPatterns: {
    general: {
      preferredTimes: string[];
      avoidTimes: string[];
      peakHours: string[];
    };
    specialist: {
      preferredTimes: string[];
      waitingPeriod: {
        min: number; // days
        max: number; // days
        average: number; // days
      };
    };
  };
}

export interface CulturalHealthcarePractice {
  culture: 'malay' | 'chinese' | 'indian' | 'general';
  practices: {
    consultationStyle: string;
    familyInvolvement: 'high' | 'medium' | 'low';
    elderRespect: boolean;
    genderPreferences: {
      elderlyFemale: 'female_preferred' | 'no_preference';
      children: 'no_preference' | 'parent_supervised';
    };
    communicationStyle: 'direct' | 'respectful' | 'through_family';
    decisionMaking: 'individual' | 'family_consensus' | 'elder_decides';
  };
  timingPreferences: {
    preferredHours: string[];
    avoidedHours: string[];
    culturalTiming: string[];
  };
  traditionalIntegration: {
    acceptsTraditionalMedicine: boolean;
    integrativeApproach: boolean;
    consultationRequired: boolean;
  };
}

export interface MedicationAccessPattern {
  medicationType: 'prescription' | 'otc' | 'supplement' | 'traditional';
  availableLocations: Array<{
    type: 'government_clinic' | 'private_clinic' | 'pharmacy' | 'hospital' | 'tcm_shop' | 'ayurveda_center';
    accessibility: 'high' | 'medium' | 'low';
    costLevel: 'subsidized' | 'moderate' | 'high';
    waitTime: string;
  }>;
  stockPatterns: {
    commonMedications: 'always_available' | 'usually_available' | 'sometimes_available';
    specializedMedications: 'order_required' | 'limited_availability' | 'referral_needed';
    traditionalMedicine: 'widely_available' | 'specialized_shops' | 'limited';
  };
  culturalAcceptance: {
    malay: 'high' | 'medium' | 'low';
    chinese: 'high' | 'medium' | 'low';
    indian: 'high' | 'medium' | 'low';
  };
}

class MalaysianHealthcarePatterns {
  private static instance: MalaysianHealthcarePatterns;

  // Malaysian healthcare timing patterns
  private readonly HEALTHCARE_TIMING: MalaysianHealthcareTiming = {
    clinicHours: {
      government: {
        weekdays: { open: '08:00', close: '17:00' },
        saturday: { open: '08:00', close: '13:00' },
        sunday: null
      },
      private: {
        weekdays: { open: '09:00', close: '19:00' },
        saturday: { open: '09:00', close: '17:00' },
        sunday: { open: '09:00', close: '13:00' }
      }
    },
    pharmacyHours: {
      standard: {
        weekdays: { open: '09:00', close: '22:00' },
        saturday: { open: '09:00', close: '22:00' },
        sunday: { open: '09:00', close: '22:00' }
      },
      hospital: {
        available: '24/7'
      },
      guardian: {
        weekdays: { open: '08:00', close: '23:00' },
        saturday: { open: '08:00', close: '23:00' },
        sunday: { open: '08:00', close: '23:00' }
      }
    },
    emergencyServices: {
      available: '24/7',
      response: {
        urban: '8-15 minutes',
        suburban: '15-25 minutes',
        rural: '25-45 minutes'
      }
    },
    appointmentPatterns: {
      general: {
        preferredTimes: ['09:00', '10:00', '14:00', '15:00'],
        avoidTimes: ['12:00-14:00', '17:00-19:00'], // Lunch and prayer times
        peakHours: ['09:00-11:00', '14:00-16:00']
      },
      specialist: {
        preferredTimes: ['09:00', '10:00', '14:00', '15:00'],
        waitingPeriod: {
          min: 7,
          max: 90,
          average: 30
        }
      }
    }
  };

  // Cultural healthcare practices
  private readonly CULTURAL_PRACTICES: CulturalHealthcarePractice[] = [
    {
      culture: 'malay',
      practices: {
        consultationStyle: 'Respectful, involving family in decisions',
        familyInvolvement: 'high',
        elderRespect: true,
        genderPreferences: {
          elderlyFemale: 'female_preferred',
          children: 'parent_supervised'
        },
        communicationStyle: 'respectful',
        decisionMaking: 'family_consensus'
      },
      timingPreferences: {
        preferredHours: ['09:00-11:30', '14:30-16:30'], // Avoiding prayer times
        avoidedHours: ['12:00-14:00', '18:00-19:30'], // Zohor and Maghrib
        culturalTiming: ['After morning prayers', 'Before evening prayers']
      },
      traditionalIntegration: {
        acceptsTraditionalMedicine: true,
        integrativeApproach: true,
        consultationRequired: false
      }
    },
    {
      culture: 'chinese',
      practices: {
        consultationStyle: 'Family-oriented, eldest makes decisions',
        familyInvolvement: 'high',
        elderRespect: true,
        genderPreferences: {
          elderlyFemale: 'no_preference',
          children: 'parent_supervised'
        },
        communicationStyle: 'through_family',
        decisionMaking: 'elder_decides'
      },
      timingPreferences: {
        preferredHours: ['10:00-12:00', '14:00-17:00'],
        avoidedHours: ['07:00-09:00', '19:00-21:00'], // Traditional meal times
        culturalTiming: ['After breakfast', 'Afternoon']
      },
      traditionalIntegration: {
        acceptsTraditionalMedicine: true,
        integrativeApproach: true,
        consultationRequired: true
      }
    },
    {
      culture: 'indian',
      practices: {
        consultationStyle: 'Respectful, involving extended family',
        familyInvolvement: 'high',
        elderRespect: true,
        genderPreferences: {
          elderlyFemale: 'female_preferred',
          children: 'parent_supervised'
        },
        communicationStyle: 'respectful',
        decisionMaking: 'family_consensus'
      },
      timingPreferences: {
        preferredHours: ['10:00-12:00', '15:00-17:00'],
        avoidedHours: ['06:00-08:00', '18:00-20:00'], // Prayer and meal times
        culturalTiming: ['After morning prayers', 'Afternoon']
      },
      traditionalIntegration: {
        acceptsTraditionalMedicine: true,
        integrativeApproach: true,
        consultationRequired: true
      }
    }
  ];

  // Medication access patterns
  private readonly MEDICATION_ACCESS: Record<string, MedicationAccessPattern> = {
    prescription: {
      medicationType: 'prescription',
      availableLocations: [
        { type: 'government_clinic', accessibility: 'high', costLevel: 'subsidized', waitTime: '30-90 minutes' },
        { type: 'private_clinic', accessibility: 'medium', costLevel: 'moderate', waitTime: '15-45 minutes' },
        { type: 'hospital', accessibility: 'high', costLevel: 'subsidized', waitTime: '60-180 minutes' },
        { type: 'pharmacy', accessibility: 'high', costLevel: 'moderate', waitTime: '5-15 minutes' }
      ],
      stockPatterns: {
        commonMedications: 'always_available',
        specializedMedications: 'order_required',
        traditionalMedicine: 'limited'
      },
      culturalAcceptance: {
        malay: 'high',
        chinese: 'high',
        indian: 'high'
      }
    },
    traditional: {
      medicationType: 'traditional',
      availableLocations: [
        { type: 'tcm_shop', accessibility: 'medium', costLevel: 'moderate', waitTime: '10-30 minutes' },
        { type: 'ayurveda_center', accessibility: 'low', costLevel: 'moderate', waitTime: '30-60 minutes' }
      ],
      stockPatterns: {
        commonMedications: 'limited',
        specializedMedications: 'specialized_shops',
        traditionalMedicine: 'widely_available'
      },
      culturalAcceptance: {
        malay: 'medium',
        chinese: 'high',
        indian: 'high'
      }
    }
  };

  private constructor() {}

  static getInstance(): MalaysianHealthcarePatterns {
    if (!MalaysianHealthcarePatterns.instance) {
      MalaysianHealthcarePatterns.instance = new MalaysianHealthcarePatterns();
    }
    return MalaysianHealthcarePatterns.instance;
  }

  /**
   * Get healthcare timing patterns for Malaysia
   */
  getHealthcareTiming(): MalaysianHealthcareTiming {
    return this.HEALTHCARE_TIMING;
  }

  /**
   * Get optimal appointment times based on cultural preferences
   */
  getOptimalAppointmentTimes(
    culture: 'malay' | 'chinese' | 'indian' | 'general',
    appointmentType: 'general' | 'specialist' = 'general'
  ): Array<{
    time: string;
    preference: 'optimal' | 'good' | 'acceptable';
    culturalNotes: string[];
    availability: 'high' | 'medium' | 'low';
  }> {
    const culturalPractice = this.CULTURAL_PRACTICES.find(p => p.culture === culture);
    const generalTiming = this.HEALTHCARE_TIMING.appointmentPatterns[appointmentType];
    
    const times: Array<{
      time: string;
      preference: 'optimal' | 'good' | 'acceptable';
      culturalNotes: string[];
      availability: 'high' | 'medium' | 'low';
    }> = [];

    // Generate time slots from 8 AM to 6 PM
    for (let hour = 8; hour <= 18; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      let preference: 'optimal' | 'good' | 'acceptable' = 'acceptable';
      let availability: 'high' | 'medium' | 'low' = 'medium';
      const culturalNotes: string[] = [];

      // Check against general preferred times
      if (generalTiming.preferredTimes.includes(time)) {
        preference = 'optimal';
        availability = 'high';
      }

      // Check against cultural preferences if available
      if (culturalPractice) {
        const isPreferredHour = culturalPractice.timingPreferences.preferredHours.some(range => {
          const [start, end] = range.split('-');
          const startHour = parseInt(start.split(':')[0]);
          const endHour = parseInt(end.split(':')[0]);
          return hour >= startHour && hour <= endHour;
        });

        const isAvoidedHour = culturalPractice.timingPreferences.avoidedHours.some(range => {
          const [start, end] = range.split('-');
          const startHour = parseInt(start.split(':')[0]);
          const endHour = parseInt(end.split(':')[0]);
          return hour >= startHour && hour <= endHour;
        });

        if (isPreferredHour) {
          preference = preference === 'optimal' ? 'optimal' : 'good';
          culturalNotes.push(`Preferred time for ${culture} culture`);
        }

        if (isAvoidedHour) {
          preference = 'acceptable';
          availability = 'low';
          culturalNotes.push(`May conflict with ${culture} cultural practices`);
        }

        // Add cultural timing notes
        culturalPractice.timingPreferences.culturalTiming.forEach(note => {
          if ((hour >= 9 && hour <= 11 && note.includes('morning')) ||
              (hour >= 14 && hour <= 16 && note.includes('afternoon'))) {
            culturalNotes.push(note);
          }
        });
      }

      // Check against peak hours (lower availability)
      if (generalTiming.peakHours.some(range => {
        const [start, end] = range.split('-');
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        return hour >= startHour && hour <= endHour;
      })) {
        availability = 'low';
        culturalNotes.push('Peak appointment hours - longer wait times expected');
      }

      times.push({
        time,
        preference,
        culturalNotes,
        availability
      });
    }

    return times.filter(t => t.preference !== 'acceptable' || t.culturalNotes.length === 0);
  }

  /**
   * Get medication access recommendations
   */
  getMedicationAccessRecommendations(
    medicationType: 'prescription' | 'otc' | 'supplement' | 'traditional',
    culture: 'malay' | 'chinese' | 'indian',
    urgency: 'routine' | 'urgent' | 'emergency' = 'routine'
  ): Array<{
    location: string;
    accessibility: 'high' | 'medium' | 'low';
    estimatedCost: 'subsidized' | 'moderate' | 'high';
    waitTime: string;
    culturalSuitability: 'high' | 'medium' | 'low';
    recommendations: string[];
  }> {
    const accessPattern = this.MEDICATION_ACCESS[medicationType];
    if (!accessPattern) return [];

    const recommendations = accessPattern.availableLocations.map(location => {
      const culturalSuitability = accessPattern.culturalAcceptance[culture];
      const locationRecommendations: string[] = [];

      // Add urgency-based recommendations
      if (urgency === 'emergency') {
        if (location.type === 'hospital') {
          locationRecommendations.push('24/7 emergency pharmacy available');
        } else {
          locationRecommendations.push('May not be available for emergency needs');
        }
      }

      // Add cultural recommendations
      if (culture === 'malay' && location.type === 'government_clinic') {
        locationRecommendations.push('Halal-certified medications available');
        locationRecommendations.push('Prayer room facilities available');
      }

      if (culture === 'chinese' && location.type === 'tcm_shop') {
        locationRecommendations.push('Traditional Chinese medicine expertise');
        locationRecommendations.push('Can coordinate with TCM practitioners');
      }

      if (culture === 'indian' && location.type === 'ayurveda_center') {
        locationRecommendations.push('Ayurvedic medicine consultation available');
        locationRecommendations.push('Vegetarian medication options');
      }

      // Add general recommendations
      if (location.costLevel === 'subsidized') {
        locationRecommendations.push('Government-subsidized pricing available');
      }

      if (location.accessibility === 'high') {
        locationRecommendations.push('Easily accessible location');
      }

      return {
        location: location.type.replace('_', ' ').toUpperCase(),
        accessibility: location.accessibility,
        estimatedCost: location.costLevel,
        waitTime: location.waitTime,
        culturalSuitability,
        recommendations: locationRecommendations
      };
    });

    // Sort by cultural suitability and urgency
    return recommendations.sort((a, b) => {
      if (urgency === 'emergency') {
        // Prioritize hospitals for emergencies
        if (a.location.includes('HOSPITAL')) return -1;
        if (b.location.includes('HOSPITAL')) return 1;
      }
      
      // Then by cultural suitability
      const suitabilityOrder = { high: 3, medium: 2, low: 1 };
      return suitabilityOrder[b.culturalSuitability] - suitabilityOrder[a.culturalSuitability];
    });
  }

  /**
   * Get healthcare provider recommendations by state
   */
  getHealthcareProvidersByState(
    state: MalaysianState,
    serviceType: 'emergency' | 'consultation' | 'pharmacy' | 'specialist' = 'consultation'
  ): Array<{
    name: string;
    type: string;
    operatingHours: any;
    culturalServices: any;
    estimatedWaitTime: string;
    suitability: 'excellent' | 'good' | 'fair';
  }> {
    // This would be populated from a real database in production
    const sampleProviders = [
      {
        name: 'Klinik Kesihatan Putrajaya',
        type: 'Government Clinic',
        operatingHours: this.HEALTHCARE_TIMING.clinicHours.government,
        culturalServices: {
          languages: ['ms', 'en'],
          culturallyTrained: true,
          religiousConsiderations: true,
          traditionalMedicine: false
        },
        estimatedWaitTime: '45-90 minutes',
        suitability: 'excellent' as const
      },
      {
        name: 'Guardian Pharmacy',
        type: 'Private Pharmacy',
        operatingHours: this.HEALTHCARE_TIMING.pharmacyHours.guardian,
        culturalServices: {
          languages: ['ms', 'en', 'zh'],
          culturallyTrained: false,
          religiousConsiderations: false,
          traditionalMedicine: false
        },
        estimatedWaitTime: '5-15 minutes',
        suitability: 'good' as const
      }
    ];

    return sampleProviders;
  }

  /**
   * Calculate optimal healthcare visit timing
   */
  calculateOptimalVisitTiming(
    culture: 'malay' | 'chinese' | 'indian' | 'general',
    visitType: 'routine' | 'follow_up' | 'emergency',
    preferredDate: Date
  ): {
    recommendedTimes: Array<{
      time: string;
      score: number;
      reasons: string[];
    }>;
    culturalConsiderations: string[];
    alternativeDates: Date[];
  } {
    const culturalPractice = this.CULTURAL_PRACTICES.find(p => p.culture === culture);
    const recommendedTimes: Array<{ time: string; score: number; reasons: string[] }> = [];
    const culturalConsiderations: string[] = [];
    const alternativeDates: Date[] = [];

    // Generate time recommendations
    const optimalTimes = this.getOptimalAppointmentTimes(culture, visitType === 'routine' ? 'general' : 'specialist');
    
    optimalTimes.forEach(timeSlot => {
      let score = 50; // Base score
      const reasons: string[] = [];

      // Adjust score based on preference
      switch (timeSlot.preference) {
        case 'optimal':
          score += 30;
          reasons.push('Optimal timing for healthcare visits');
          break;
        case 'good':
          score += 15;
          reasons.push('Good timing with minor considerations');
          break;
        case 'acceptable':
          score += 0;
          reasons.push('Acceptable timing');
          break;
      }

      // Adjust score based on availability
      switch (timeSlot.availability) {
        case 'high':
          score += 20;
          reasons.push('High availability - shorter wait times');
          break;
        case 'medium':
          score += 10;
          reasons.push('Moderate availability');
          break;
        case 'low':
          score -= 10;
          reasons.push('Lower availability - longer wait times');
          break;
      }

      // Add cultural reasons
      reasons.push(...timeSlot.culturalNotes);

      recommendedTimes.push({
        time: timeSlot.time,
        score,
        reasons
      });
    });

    // Sort by score
    recommendedTimes.sort((a, b) => b.score - a.score);

    // Add cultural considerations
    if (culturalPractice) {
      culturalConsiderations.push(
        `Family involvement level: ${culturalPractice.practices.familyInvolvement}`,
        `Communication style: ${culturalPractice.practices.communicationStyle}`,
        `Decision making: ${culturalPractice.practices.decisionMaking}`
      );

      if (culturalPractice.traditionalIntegration.acceptsTraditionalMedicine) {
        culturalConsiderations.push('Healthcare provider may need to coordinate with traditional medicine practitioners');
      }
    }

    // Generate alternative dates (next 3 weekdays)
    for (let i = 1; i <= 3; i++) {
      const altDate = new Date(preferredDate);
      altDate.setDate(altDate.getDate() + i);
      
      // Skip weekends for government clinics
      if (altDate.getDay() === 0) { // Sunday
        altDate.setDate(altDate.getDate() + 1);
      }
      
      alternativeDates.push(altDate);
    }

    return {
      recommendedTimes: recommendedTimes.slice(0, 5), // Top 5 recommendations
      culturalConsiderations,
      alternativeDates
    };
  }

  /**
   * Get medication scheduling recommendations based on healthcare patterns
   */
  getHealthcareSchedulingRecommendations(
    medications: Array<{ name: string; frequency: string; timing?: string[] }>,
    culture: 'malay' | 'chinese' | 'indian' | 'general'
  ): Array<{
    medication: string;
    recommendedTimes: string[];
    healthcareCoordination: string[];
    culturalNotes: string[];
  }> {
    const culturalPractice = this.CULTURAL_PRACTICES.find(p => p.culture === culture);
    
    return medications.map(medication => {
      const recommendations = {
        medication: medication.name,
        recommendedTimes: [] as string[],
        healthcareCoordination: [] as string[],
        culturalNotes: [] as string[]
      };

      // Base timing recommendations
      if (medication.frequency === 'daily') {
        recommendations.recommendedTimes = ['09:00'];
      } else if (medication.frequency === 'twice_daily') {
        recommendations.recommendedTimes = ['09:00', '21:00'];
      } else if (medication.frequency === 'three_times') {
        recommendations.recommendedTimes = ['09:00', '15:00', '21:00'];
      }

      // Healthcare coordination
      recommendations.healthcareCoordination = [
        'Schedule regular follow-up appointments',
        'Coordinate with clinic hours for medication refills',
        'Plan for medication reviews during routine visits'
      ];

      // Cultural adjustments
      if (culturalPractice) {
        // Adjust timing based on cultural preferences
        const culturalTimes = recommendations.recommendedTimes.map(time => {
          const hour = parseInt(time.split(':')[0]);
          
          // Check if time falls in avoided hours
          const isAvoidedHour = culturalPractice.timingPreferences.avoidedHours.some(range => {
            const [start, end] = range.split('-');
            const startHour = parseInt(start.split(':')[0]);
            const endHour = parseInt(end.split(':')[0]);
            return hour >= startHour && hour <= endHour;
          });

          if (isAvoidedHour) {
            // Adjust to nearby preferred time
            if (hour < 12) {
              return '10:00'; // Morning adjustment
            } else {
              return '15:00'; // Afternoon adjustment
            }
          }

          return time;
        });

        recommendations.recommendedTimes = culturalTimes;

        // Add cultural notes
        if (culture === 'malay') {
          recommendations.culturalNotes.push(
            'Timing adjusted to avoid prayer times',
            'Ensure halal compliance for all medications',
            'Family involvement in medication decisions is important'
          );
        } else if (culture === 'chinese') {
          recommendations.culturalNotes.push(
            'Consider Traditional Chinese Medicine interactions',
            'Family elder consultation for medication changes',
            'Coordinate with TCM practitioner if applicable'
          );
        } else if (culture === 'indian') {
          recommendations.culturalNotes.push(
            'Ensure vegetarian medication options when possible',
            'Consider Ayurvedic medicine interactions',
            'Respect for religious observance timing'
          );
        }
      }

      return recommendations;
    });
  }
}

export default MalaysianHealthcarePatterns;