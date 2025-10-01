/**
 * Family Medication Coordination Hook
 * 
 * Specialized hook for managing medication schedules across family members
 * with Malaysian cultural considerations including elderly care, children supervision,
 * and traditional family hierarchies.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectCulturalProfile } from '../../store/slices/culturalSlice';
import { 
  familySchedulingCoordination,
  malaysianMealPatterns,
  type FamilyMember,
  type HouseholdStructure,
  type FamilySchedulingResult,
  type CoordinationChallenge
} from '../../services/scheduling';
import { useCulturalScheduling } from './useCulturalScheduling';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { Medication } from '../../types/medication';
import { EnhancedCulturalProfile } from '../../types/cultural';

interface FamilyCoordinationState {
  isLoading: boolean;
  error: string | null;
  householdSchedule: FamilySchedulingResult | null;
  elderlyRecommendations: any[] | null;
  childrenScheduling: any[] | null;
  supervisionPlan: any[] | null;
  challenges: CoordinationChallenge[];
}

interface FamilyCoordinationOptions {
  enableElderlySupervision?: boolean;
  enableChildrenScheduling?: boolean;
  includeCulturalHierarchy?: boolean;
  includeWorkScheduleCoordination?: boolean;
  includePrayerTimeCoordination?: boolean;
  autoResolveConflicts?: boolean;
}

export const useFamilyMedicationCoordination = (
  familyMembers: FamilyMember[] = [],
  householdStructure?: HouseholdStructure,
  options: FamilyCoordinationOptions = {}
) => {
  const dispatch = useAppDispatch();
  const culturalProfile = useAppSelector(selectCulturalProfile);
  
  // Integration with main cultural scheduling
  const {
    generateCulturalSchedule,
    isCurrentlyOptimal,
    translateSchedulingRecommendation
  } = useCulturalScheduling();

  // Multi-language support
  const { t, currentLanguage } = useTranslation();

  // State management
  const [state, setState] = useState<FamilyCoordinationState>({
    isLoading: false,
    error: null,
    householdSchedule: null,
    elderlyRecommendations: null,
    childrenScheduling: null,
    supervisionPlan: null,
    challenges: []
  });

  // Default household structure based on cultural profile
  const defaultHouseholdStructure = useMemo((): HouseholdStructure => {
    const primaryCulture = culturalProfile?.primaryCulture || 'mixed';
    
    return {
      id: 'default_household',
      headOfHousehold: {
        primary: familyMembers.find(m => m.culturalRole.hierarchy === 'eldest')?.id || 
                familyMembers[0]?.id || 'unknown'
      },
      livingArrangement: familyMembers.some(m => m.age >= 65) ? 'multigenerational' : 'nuclear',
      culturalDynamics: {
        primaryCulture,
        decisionMaking: primaryCulture === 'chinese' ? 'patriarch' : 
                       primaryCulture === 'malay' ? 'shared' : 'democratic',
        elderCareApproach: primaryCulture === 'mixed' ? 'modern' : 'traditional',
        childCareApproach: 'mixed'
      },
      communicationPatterns: {
        primaryLanguage: culturalProfile?.languages?.[0]?.code || 'en',
        elderCommunication: 'respectful',
        childCommunication: 'nurturing',
        conflictResolution: 'discussion'
      },
      routines: {
        mealTimes: {
          breakfast: { time: '07:30', participants: familyMembers.map(m => m.id), duration: 30 },
          lunch: { time: '12:30', participants: familyMembers.map(m => m.id), duration: 45 },
          dinner: { time: '19:30', participants: familyMembers.map(m => m.id), duration: 60 }
        },
        gatherings: [
          {
            type: 'family_meeting',
            time: '20:00',
            participants: familyMembers.map(m => m.id),
            frequency: 'weekly'
          }
        ]
      }
    };
  }, [culturalProfile, familyMembers]);

  // Active household structure (provided or default)
  const activeHouseholdStructure = householdStructure || defaultHouseholdStructure;

  // Elderly family members
  const elderlyMembers = useMemo(() => 
    familyMembers.filter(member => member.age >= 65),
    [familyMembers]
  );

  // Children family members
  const childrenMembers = useMemo(() => 
    familyMembers.filter(member => member.age < 18),
    [familyMembers]
  );

  // Available caregivers
  const availableCaregivers = useMemo(() => 
    familyMembers.filter(member => 
      member.culturalRole.primary === 'caregiver' ||
      (member.age >= 18 && member.age < 70 && member.healthStatus.cognitiveStatus === 'clear')
    ),
    [familyMembers]
  );

  // Generate comprehensive household medication schedule
  const generateHouseholdSchedule = useCallback(async (): Promise<FamilySchedulingResult | null> => {
    if (!culturalProfile || familyMembers.length === 0) {
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const householdSchedule = familySchedulingCoordination.coordinateHouseholdSchedule(
        familyMembers,
        activeHouseholdStructure,
        culturalProfile
      );

      setState(prev => ({ 
        ...prev, 
        householdSchedule,
        supervisionPlan: householdSchedule.supervisionPlan,
        challenges: householdSchedule.challenges,
        isLoading: false 
      }));

      return householdSchedule;

    } catch (error) {
      console.error('Household scheduling failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Household scheduling failed',
        isLoading: false 
      }));
      
      return null;
    }
  }, [culturalProfile, familyMembers, activeHouseholdStructure]);

  // Generate elderly-specific scheduling recommendations
  const generateElderlyRecommendations = useCallback(async () => {
    if (!options.enableElderlySupervision || elderlyMembers.length === 0 || !culturalProfile) {
      return null;
    }

    try {
      const recommendations = familySchedulingCoordination.generateElderlySchedulingRecommendations(
        elderlyMembers,
        availableCaregivers,
        culturalProfile
      );

      setState(prev => ({ ...prev, elderlyRecommendations: recommendations }));
      return recommendations;

    } catch (error) {
      console.error('Elderly recommendations generation failed:', error);
      return null;
    }
  }, [options.enableElderlySupervision, elderlyMembers, availableCaregivers, culturalProfile]);

  // Optimize children's medication schedules
  const optimizeChildrenScheduling = useCallback(async () => {
    if (!options.enableChildrenScheduling || childrenMembers.length === 0) {
      return null;
    }

    try {
      const childrenScheduling = familySchedulingCoordination.optimizeChildrenScheduling(
        childrenMembers,
        availableCaregivers,
        activeHouseholdStructure
      );

      setState(prev => ({ ...prev, childrenScheduling }));
      return childrenScheduling;

    } catch (error) {
      console.error('Children scheduling optimization failed:', error);
      return null;
    }
  }, [options.enableChildrenScheduling, childrenMembers, availableCaregivers, activeHouseholdStructure]);

  // Check for scheduling conflicts across family members
  const checkFamilySchedulingConflicts = useCallback(() => {
    const conflicts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      affectedMembers: string[];
      suggestedResolution: string;
    }> = [];

    // Check supervision capacity vs needs
    const highNeedMembers = familyMembers.filter(member => 
      member.healthStatus.cognitiveStatus !== 'clear' ||
      member.age < 12 ||
      member.healthStatus.medicationComplexity === 'high'
    );

    if (highNeedMembers.length > availableCaregivers.length) {
      conflicts.push({
        type: 'supervision_shortage',
        severity: 'high',
        description: t('family.supervision_shortage'),
        affectedMembers: highNeedMembers.map(m => m.name),
        suggestedResolution: t('family.supervision_shortage_solution')
      });
    }

    // Check for simultaneous medication times
    const medicationTimes: Array<{ time: string; member: string; medication: string }> = [];
    familyMembers.forEach(member => {
      member.medications.forEach(medInfo => {
        medInfo.medication.timing?.forEach(timing => {
          medicationTimes.push({
            time: timing.time,
            member: member.name,
            medication: medInfo.medication.name
          });
        });
      });
    });

    // Group by time to find clustering
    const timeGroups = medicationTimes.reduce((groups, item) => {
      if (!groups[item.time]) groups[item.time] = [];
      groups[item.time].push(item);
      return groups;
    }, {} as Record<string, typeof medicationTimes>);

    Object.entries(timeGroups).forEach(([time, items]) => {
      if (items.length > 2) {
        conflicts.push({
          type: 'time_clustering',
          severity: 'medium',
          description: t('family.time_clustering', { time, count: items.length }),
          affectedMembers: items.map(item => item.member),
          suggestedResolution: t('family.time_clustering_solution')
        });
      }
    });

    return conflicts;
  }, [familyMembers, availableCaregivers, t]);

  // Generate family coordination summary
  const getFamilyCoordinationSummary = useCallback(() => {
    const summary = {
      totalMembers: familyMembers.length,
      elderlyMembers: elderlyMembers.length,
      childrenMembers: childrenMembers.length,
      availableCaregivers: availableCaregivers.length,
      totalMedications: familyMembers.reduce((total, member) => 
        total + member.medications.length, 0
      ),
      complexityLevel: 'low' as 'low' | 'medium' | 'high',
      culturalConsiderations: [] as string[],
      supervisionNeeds: {
        high: familyMembers.filter(m => 
          m.healthStatus.cognitiveStatus !== 'clear' || 
          m.healthStatus.medicationComplexity === 'high'
        ).length,
        medium: familyMembers.filter(m => 
          m.age < 12 || m.age > 75
        ).length,
        low: familyMembers.filter(m => 
          m.age >= 12 && m.age <= 75 && 
          m.healthStatus.cognitiveStatus === 'clear'
        ).length
      }
    };

    // Calculate complexity
    if (summary.elderlyMembers >= 2 || summary.totalMedications >= 10 || summary.supervisionNeeds.high >= 2) {
      summary.complexityLevel = 'high';
    } else if (summary.elderlyMembers >= 1 || summary.totalMedications >= 5 || summary.supervisionNeeds.high >= 1) {
      summary.complexityLevel = 'medium';
    }

    // Add cultural considerations
    const primaryCulture = culturalProfile?.primaryCulture;
    if (primaryCulture === 'chinese') {
      summary.culturalConsiderations.push(
        'Eldest son responsibility for elderly care',
        'Family hierarchy important in decision making',
        'TCM integration considerations'
      );
    } else if (primaryCulture === 'malay') {
      summary.culturalConsiderations.push(
        'Islamic duty to care for elderly parents',
        'Prayer time coordination needed',
        'Halal medication compliance required'
      );
    } else if (primaryCulture === 'indian') {
      summary.culturalConsiderations.push(
        'Joint family system supports elderly care',
        'Vegetarian medication considerations',
        'Religious observance timing'
      );
    }

    return summary;
  }, [familyMembers, elderlyMembers, childrenMembers, availableCaregivers, culturalProfile]);

  // Get supervision recommendations for specific time
  const getSupervisionRecommendations = useCallback((time: string) => {
    const recommendations: Array<{
      supervisor: string;
      responsibility: string;
      priority: 'high' | 'medium' | 'low';
      culturalNotes: string[];
    }> = [];

    // Find members needing supervision at this time
    const membersNeedingSupervision = familyMembers.filter(member =>
      member.medications.some(medInfo =>
        medInfo.medication.timing?.some(timing => timing.time === time) &&
        (medInfo.supervisionNeeded || member.age < 18 || member.healthStatus.cognitiveStatus !== 'clear')
      )
    );

    if (membersNeedingSupervision.length === 0) {
      return recommendations;
    }

    // Assign supervisors based on availability and cultural appropriateness
    membersNeedingSupervision.forEach(member => {
      const availableSupervisor = availableCaregivers.find(caregiver => {
        // Check availability at this time
        const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
        return caregiver.schedule.availabilityWindows.some(window => {
          const startMinutes = parseInt(window.start.split(':')[0]) * 60 + parseInt(window.start.split(':')[1]);
          const endMinutes = parseInt(window.end.split(':')[0]) * 60 + parseInt(window.end.split(':')[1]);
          return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
        });
      });

      if (availableSupervisor) {
        const culturalNotes: string[] = [];
        let priority: 'high' | 'medium' | 'low' = 'medium';

        // Add cultural context
        if (member.age >= 65) {
          priority = 'high';
          if (culturalProfile?.primaryCulture === 'chinese' && availableSupervisor.relationship === 'child') {
            culturalNotes.push('Filial piety - child caring for elderly parent');
          } else if (culturalProfile?.primaryCulture === 'malay') {
            culturalNotes.push('Islamic duty - caring for elderly family member');
          }
        } else if (member.age < 12) {
          priority = 'high';
          culturalNotes.push('Children require direct adult supervision for medications');
        }

        recommendations.push({
          supervisor: availableSupervisor.name,
          responsibility: `Supervise ${member.name}'s medication at ${time}`,
          priority,
          culturalNotes
        });
      }
    });

    return recommendations;
  }, [familyMembers, availableCaregivers, culturalProfile]);

  // Auto-generate household schedule when family members change
  useEffect(() => {
    if (familyMembers.length > 0) {
      generateHouseholdSchedule();
    }
  }, [generateHouseholdSchedule]);

  // Auto-generate elderly recommendations when enabled
  useEffect(() => {
    if (options.enableElderlySupervision) {
      generateElderlyRecommendations();
    }
  }, [generateElderlyRecommendations, options.enableElderlySupervision]);

  // Auto-optimize children scheduling when enabled
  useEffect(() => {
    if (options.enableChildrenScheduling) {
      optimizeChildrenScheduling();
    }
  }, [optimizeChildrenScheduling, options.enableChildrenScheduling]);

  return {
    // State
    ...state,
    
    // Configuration
    isConfigured: familyMembers.length > 0 && !!culturalProfile,
    householdStructure: activeHouseholdStructure,
    
    // Core functions
    generateHouseholdSchedule,
    generateElderlyRecommendations,
    optimizeChildrenScheduling,
    checkFamilySchedulingConflicts,
    
    // Utility functions
    getFamilyCoordinationSummary,
    getSupervisionRecommendations,
    translateSchedulingRecommendation,
    
    // Family insights
    familySummary: getFamilyCoordinationSummary(),
    schedulingConflicts: checkFamilySchedulingConflicts(),
    
    // Member categorization
    elderlyMembers,
    childrenMembers,
    availableCaregivers,
    
    // Supervision analysis
    hasElderlyMembers: elderlyMembers.length > 0,
    hasChildrenMembers: childrenMembers.length > 0,
    hasSupervisionChallenges: checkFamilySchedulingConflicts().length > 0,
    supervisionCapacity: availableCaregivers.length,
    supervisionNeeds: familyMembers.filter(m => 
      m.medications.some(med => med.supervisionNeeded) ||
      m.age < 18 ||
      m.healthStatus.cognitiveStatus !== 'clear'
    ).length,
    
    // Cultural context
    culturalHierarchy: activeHouseholdStructure.culturalDynamics.decisionMaking,
    elderCareApproach: activeHouseholdStructure.culturalDynamics.elderCareApproach,
    communicationStyle: activeHouseholdStructure.communicationPatterns.elderCommunication,
    
    // Multi-language support
    t,
    currentLanguage,
    
    // Integration
    isCurrentlyOptimal,
    generateCulturalSchedule
  };
};