/**
 * Cultural Family Patterns Service
 * Manages Malaysian family structures and cultural healthcare patterns
 * Integrates with privacy controls for culturally-appropriate data sharing
 */

import { EventEmitter } from 'events';
import { culturalIntelligenceService } from '../cultural/CulturalIntelligenceService';
import {
  MalaysianFamilyRelationship,
  CulturalFamilyRole,
  GenderRestriction,
  ReligiousPrivacyConsideration
} from './PrivacyManager';

// Malaysian Family Structure Types
export interface MalaysianFamilyStructure {
  type: FamilyStructureType;
  headOfFamily?: FamilyMember;
  members: FamilyMember[];
  culturalRoles: Map<string, CulturalFamilyRole>;
  hierarchy: FamilyHierarchy;
  decisionMakingPattern: DecisionMakingPattern;
  caregivingResponsibilities: Map<string, string[]>;
  culturalPreferences: FamilyCulturalPreferences;
}

export type FamilyStructureType =
  | 'nuclear' // Parents and children only
  | 'extended' // Include grandparents, aunts, uncles
  | 'multigenerational' // Three or more generations
  | 'joint' // Multiple nuclear families
  | 'single_parent'
  | 'grandparent_led';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: MalaysianFamilyRelationship;
  gender: 'male' | 'female';
  ageGroup: AgeGroup;
  culturalRole?: CulturalFamilyRole;
  religiousAffiliation?: string;
  languagePreference: 'ms' | 'en' | 'zh' | 'ta';
  respectTitle?: string; // Pak, Mak, Abang, Kakak, etc.
  primaryCaregiver?: boolean;
}

export type AgeGroup =
  | 'child' // < 12
  | 'adolescent' // 12-17
  | 'young_adult' // 18-35
  | 'adult' // 36-59
  | 'elder'; // 60+

export interface FamilyHierarchy {
  levels: HierarchyLevel[];
  respectOrder: string[]; // Member IDs in order of respect
  decisionAuthority: Map<string, number>; // Member ID to authority level
  culturalSeniority: Map<string, number>; // Based on age and role
}

export interface HierarchyLevel {
  level: number;
  members: string[];
  role: string;
  culturalSignificance: string;
}

export type DecisionMakingPattern =
  | 'patriarchal' // Father/eldest male leads
  | 'matriarchal' // Mother/eldest female leads
  | 'collective' // Family consensus
  | 'elder_led' // Eldest generation decides
  | 'democratic' // Equal voting
  | 'situational'; // Depends on context

export interface FamilyCulturalPreferences {
  religiousObservance: ReligiousObservanceLevel;
  genderInteractionRules?: GenderInteractionRules;
  elderRespectProtocol: ElderRespectProtocol;
  healthcareDecisionMaking: HealthcareDecisionPattern;
  privacyExpectations: PrivacyExpectation[];
  communicationStyle: CommunicationStyle;
  emergencyProtocol: EmergencyProtocol;
}

export type ReligiousObservanceLevel = 'strict' | 'moderate' | 'flexible' | 'secular';

export interface GenderInteractionRules {
  sameSexCaregiverPreferred: boolean;
  genderSeparateDiscussions: boolean;
  chaperoneRequired?: boolean;
  exceptions: string[]; // Situations where rules don't apply
}

export interface ElderRespectProtocol {
  consultationRequired: boolean;
  vetoAuthority: boolean;
  informationFiltering: boolean; // Shield elders from bad news
  honorificsRequired: boolean;
  specialPrivileges: string[];
}

export interface HealthcareDecisionPattern {
  pattern: 'individual' | 'spousal' | 'parental' | 'collective' | 'elder_guided';
  requiredConsultations: MalaysianFamilyRelationship[];
  emergencyDecisionMaker?: string;
  culturalConsiderations: string[];
}

export interface PrivacyExpectation {
  category: string;
  sharingLevel: 'open' | 'restricted' | 'private';
  culturalReason?: string;
  ageBasedRules?: Map<AgeGroup, string>;
}

export interface CommunicationStyle {
  directness: 'direct' | 'indirect' | 'contextual';
  formality: 'formal' | 'informal' | 'mixed';
  languageHierarchy: Map<MalaysianFamilyRelationship, string>;
  sensitiveTopicApproach: 'avoid' | 'indirect' | 'elder_mediated';
}

export interface EmergencyProtocol {
  primaryContact: string;
  notificationOrder: string[];
  culturalConsiderations: string[];
  religiousRequirements?: string[];
  hospitalPreference?: string;
}

// Cultural Validation Types
export interface CulturalValidationResult {
  isValid: boolean;
  concerns: CulturalConcern[];
  recommendations: string[];
  culturalScore: number; // 0-100
}

export interface CulturalConcern {
  type: 'religious' | 'gender' | 'hierarchy' | 'privacy' | 'communication';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

// Malaysian Healthcare Cultural Patterns
export interface HealthcareCulturalPattern {
  medicationAdherence: MedicationCulturalFactors;
  appointmentPatterns: AppointmentCulturalFactors;
  healthBeliefs: HealthBeliefFactors;
  familyInvolvement: FamilyInvolvementPattern;
}

export interface MedicationCulturalFactors {
  ramadanAdjustments: boolean;
  halalRequirements: boolean;
  traditionalMedicineIntegration: boolean;
  familyMedicationSharing: boolean; // Common practice to share medications
  elderSupervision: boolean;
}

export interface AppointmentCulturalFactors {
  familyAccompaniment: 'always' | 'often' | 'sometimes' | 'rarely';
  genderPreferences: boolean;
  prayerTimeAvoidance: boolean;
  festivalConsiderations: boolean;
  transportationSharing: boolean; // Family members share transport
}

export interface HealthBeliefFactors {
  fateAcceptance: 'high' | 'medium' | 'low'; // Belief in takdir/fate
  spiritualHealing: boolean;
  collectiveWellbeing: boolean; // Family health over individual
  preventionFocus: 'high' | 'medium' | 'low';
  westernMedicineAcceptance: 'full' | 'partial' | 'reluctant';
}

export interface FamilyInvolvementPattern {
  level: 'high' | 'medium' | 'low';
  decisionParticipation: string[]; // Which family members participate
  informationSharing: 'full' | 'selective' | 'minimal';
  caregivingDistribution: Map<string, string[]>; // Who cares for whom
}

class CulturalFamilyPatternsService extends EventEmitter {
  private static instance: CulturalFamilyPatternsService;
  private familyStructures: Map<string, MalaysianFamilyStructure> = new Map();
  private culturalPatterns: Map<string, HealthcareCulturalPattern> = new Map();

  // Malaysian cultural constants
  private readonly RESPECT_TITLES = {
    elder_male: ['Pak', 'Tok', 'Atuk', 'Abang'],
    elder_female: ['Mak', 'Nenek', 'Kakak', 'Cik'],
    peer_male: ['Bang', 'Bro'],
    peer_female: ['Kak', 'Sis'],
    younger: ['Dik', 'Adik']
  };

  private readonly CULTURAL_HOLIDAYS = [
    'Hari Raya Aidilfitri',
    'Hari Raya Haji',
    'Chinese New Year',
    'Deepavali',
    'Christmas',
    'Wesak Day',
    'Thaipusam'
  ];

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): CulturalFamilyPatternsService {
    if (!CulturalFamilyPatternsService.instance) {
      CulturalFamilyPatternsService.instance = new CulturalFamilyPatternsService();
    }
    return CulturalFamilyPatternsService.instance;
  }

  private initialize(): void {
    this.setupCulturalIntegration();
    this.loadDefaultPatterns();
  }

  private setupCulturalIntegration(): void {
    // Listen for cultural context changes
    culturalIntelligenceService.on('context:updated', (context) => {
      this.updateCulturalPatterns(context);
    });
  }

  private loadDefaultPatterns(): void {
    // Load common Malaysian family patterns
    this.loadMalayPattern();
    this.loadChinesePattern();
    this.loadIndianPattern();
    this.loadMixedPattern();
  }

  /**
   * Analyze family structure and determine cultural patterns
   */
  analyzeFamilyStructure(familyMembers: FamilyMember[]): MalaysianFamilyStructure {
    const structure: MalaysianFamilyStructure = {
      type: this.determineFamilyType(familyMembers),
      members: familyMembers,
      culturalRoles: this.assignCulturalRoles(familyMembers),
      hierarchy: this.buildFamilyHierarchy(familyMembers),
      decisionMakingPattern: this.determineDecisionPattern(familyMembers),
      caregivingResponsibilities: this.assignCaregivingRoles(familyMembers),
      culturalPreferences: this.determineCulturalPreferences(familyMembers)
    };

    // Identify head of family
    structure.headOfFamily = this.identifyFamilyHead(familyMembers, structure);

    return structure;
  }

  /**
   * Validate privacy settings against cultural norms
   */
  validatePrivacySettings(
    familyStructure: MalaysianFamilyStructure,
    privacySettings: any
  ): CulturalValidationResult {
    const concerns: CulturalConcern[] = [];
    const recommendations: string[] = [];
    let culturalScore = 100;

    // Check elder respect
    if (!this.validateElderRespect(familyStructure, privacySettings)) {
      concerns.push({
        type: 'hierarchy',
        severity: 'high',
        description: 'Elder family members should have appropriate access levels',
        mitigation: 'Grant view permissions to family elders for health information'
      });
      culturalScore -= 20;
    }

    // Check gender appropriateness
    const genderValidation = this.validateGenderAppropriate(familyStructure, privacySettings);
    if (!genderValidation.valid) {
      concerns.push({
        type: 'gender',
        severity: 'medium',
        description: genderValidation.concern!,
        mitigation: genderValidation.mitigation
      });
      culturalScore -= 15;
    }

    // Check religious considerations
    if (!this.validateReligiousConsiderations(familyStructure, privacySettings)) {
      concerns.push({
        type: 'religious',
        severity: 'medium',
        description: 'Privacy settings should respect religious sensitivities',
        mitigation: 'Adjust sharing settings for sensitive health information'
      });
      culturalScore -= 10;
    }

    // Generate recommendations
    if (familyStructure.type === 'multigenerational') {
      recommendations.push('Consider age-appropriate information filtering for different generations');
    }

    if (familyStructure.decisionMakingPattern === 'collective') {
      recommendations.push('Enable shared decision-making features for family healthcare');
    }

    if (familyStructure.culturalPreferences.religiousObservance === 'strict') {
      recommendations.push('Ensure gender-appropriate caregiver assignments when possible');
    }

    return {
      isValid: culturalScore >= 70,
      concerns,
      recommendations,
      culturalScore
    };
  }

  /**
   * Get culturally appropriate sharing recommendations
   */
  getSharingRecommendations(
    relationship: MalaysianFamilyRelationship,
    dataCategory: string,
    culturalContext?: any
  ): {
    recommended: boolean;
    level: 'full' | 'partial' | 'emergency_only' | 'none';
    reason: string;
    culturalFactors: string[];
  } {
    const factors: string[] = [];
    let recommendedLevel: 'full' | 'partial' | 'emergency_only' | 'none' = 'none';
    let recommended = false;

    // Spouse generally has full access
    if (relationship === 'spouse') {
      recommended = true;
      recommendedLevel = 'full';
      factors.push('Spousal care responsibility in Malaysian culture');
    }

    // Parents have high access for unmarried children
    if (relationship === 'parent' && culturalContext?.maritalStatus !== 'married') {
      recommended = true;
      recommendedLevel = dataCategory === 'medications' ? 'full' : 'partial';
      factors.push('Parental healthcare responsibility for unmarried children');
    }

    // Elder siblings often have caregiver roles
    if (relationship === 'elder_sibling') {
      recommended = true;
      recommendedLevel = 'partial';
      factors.push('Elder sibling caregiving tradition (Abang/Kakak responsibility)');
    }

    // Grandparents in multigenerational homes
    if (relationship === 'grandparent' && culturalContext?.livingArrangement === 'multigenerational') {
      recommended = true;
      recommendedLevel = 'partial';
      factors.push('Grandparent involvement in family healthcare decisions');
    }

    // Emergency access for all close family
    if (['parent', 'child', 'spouse', 'sibling'].includes(relationship)) {
      if (recommendedLevel === 'none') {
        recommendedLevel = 'emergency_only';
        recommended = true;
        factors.push('Emergency family support network');
      }
    }

    return {
      recommended,
      level: recommendedLevel,
      reason: factors.join('; '),
      culturalFactors: factors
    };
  }

  /**
   * Get family notification preferences based on cultural patterns
   */
  getFamilyNotificationPreferences(
    familyStructure: MalaysianFamilyStructure,
    urgency: 'routine' | 'important' | 'emergency'
  ): {
    notifyOrder: string[];
    channels: Map<string, string[]>;
    culturalTiming: any;
  } {
    const notifyOrder: string[] = [];
    const channels = new Map<string, string[]>();

    // Determine notification order based on hierarchy and urgency
    if (urgency === 'emergency') {
      // Emergency: Notify primary caregiver and head of family first
      if (familyStructure.headOfFamily) {
        notifyOrder.push(familyStructure.headOfFamily.id);
        channels.set(familyStructure.headOfFamily.id, ['sms', 'call', 'push']);
      }

      // Then notify primary caregivers
      familyStructure.members
        .filter(m => m.primaryCaregiver)
        .forEach(m => {
          if (!notifyOrder.includes(m.id)) {
            notifyOrder.push(m.id);
            channels.set(m.id, ['sms', 'push']);
          }
        });

      // Finally, all adult family members
      familyStructure.members
        .filter(m => ['adult', 'elder', 'young_adult'].includes(m.ageGroup))
        .forEach(m => {
          if (!notifyOrder.includes(m.id)) {
            notifyOrder.push(m.id);
            channels.set(m.id, ['push']);
          }
        });
    } else {
      // Routine/Important: Follow cultural hierarchy
      const hierarchyOrder = Array.from(familyStructure.hierarchy.respectOrder);
      hierarchyOrder.forEach(memberId => {
        const member = familyStructure.members.find(m => m.id === memberId);
        if (member && ['adult', 'elder'].includes(member.ageGroup)) {
          notifyOrder.push(memberId);
          channels.set(memberId, urgency === 'important' ? ['push', 'sms'] : ['push']);
        }
      });
    }

    // Cultural timing considerations
    const culturalTiming = {
      avoidPrayerTimes: familyStructure.culturalPreferences.religiousObservance !== 'secular',
      preferMorningForElders: true,
      avoidLateNightExceptEmergency: true,
      festivalSensitive: true
    };

    return {
      notifyOrder,
      channels,
      culturalTiming
    };
  }

  /**
   * Determine appropriate family decision makers for healthcare
   */
  getHealthcareDecisionMakers(
    familyStructure: MalaysianFamilyStructure,
    patientId: string,
    decisionType: 'routine' | 'major' | 'emergency'
  ): {
    primary: string;
    secondary: string[];
    consultative: string[];
    culturalNotes: string[];
  } {
    const patient = familyStructure.members.find(m => m.id === patientId);
    const decisionMakers = {
      primary: '',
      secondary: [],
      consultative: [],
      culturalNotes: []
    };

    if (!patient) return decisionMakers;

    // For minors, parents are primary decision makers
    if (patient.ageGroup === 'child' || patient.ageGroup === 'adolescent') {
      const parents = familyStructure.members.filter(m => m.relationship === 'parent');
      if (parents.length > 0) {
        decisionMakers.primary = parents[0].id;
        decisionMakers.secondary = parents.slice(1).map(p => p.id);
        decisionMakers.culturalNotes.push('Parents have primary healthcare decision authority for minors');
      }
    }

    // For married adults, spouse is typically primary
    if (['young_adult', 'adult'].includes(patient.ageGroup)) {
      const spouse = familyStructure.members.find(m => m.relationship === 'spouse');
      if (spouse) {
        decisionMakers.primary = spouse.id;
        decisionMakers.culturalNotes.push('Spouse is primary healthcare decision maker');
      } else {
        decisionMakers.primary = patientId;
        decisionMakers.culturalNotes.push('Patient makes own healthcare decisions');
      }

      // Add parents as consultative for major decisions
      if (decisionType === 'major') {
        const parents = familyStructure.members.filter(m => m.relationship === 'parent');
        decisionMakers.consultative = parents.map(p => p.id);
        decisionMakers.culturalNotes.push('Parents consulted for major healthcare decisions');
      }
    }

    // For elders, collective family decision with elder having veto
    if (patient.ageGroup === 'elder') {
      decisionMakers.primary = patientId;

      // Adult children as secondary
      const children = familyStructure.members.filter(
        m => m.relationship === 'child' && ['adult', 'young_adult'].includes(m.ageGroup)
      );
      decisionMakers.secondary = children.map(c => c.id);

      // Spouse if present
      const spouse = familyStructure.members.find(m => m.relationship === 'spouse');
      if (spouse) {
        decisionMakers.secondary.unshift(spouse.id);
      }

      decisionMakers.culturalNotes.push('Elder maintains autonomy with family support');
    }

    // Emergency overrides
    if (decisionType === 'emergency') {
      if (!decisionMakers.primary) {
        // Use head of family or primary caregiver
        decisionMakers.primary = familyStructure.headOfFamily?.id ||
                                familyStructure.members.find(m => m.primaryCaregiver)?.id || '';
      }
      decisionMakers.culturalNotes.push('Emergency decision protocol activated');
    }

    return decisionMakers;
  }

  // Private helper methods

  private determineFamilyType(members: FamilyMember[]): FamilyStructureType {
    const generations = new Set<number>();
    const hasGrandparents = members.some(m => m.relationship === 'grandparent');
    const hasParents = members.some(m => m.relationship === 'parent');
    const hasChildren = members.some(m => m.relationship === 'child');
    const hasExtended = members.some(m =>
      ['aunt_uncle', 'cousin', 'extended_family'].includes(m.relationship)
    );

    // Calculate generations
    if (hasGrandparents) generations.add(1);
    if (hasParents) generations.add(2);
    if (hasChildren) generations.add(3);

    if (generations.size >= 3) return 'multigenerational';
    if (hasExtended) return 'extended';
    if (hasParents && !members.find(m => m.relationship === 'spouse')) return 'single_parent';
    if (hasGrandparents && hasChildren && !hasParents) return 'grandparent_led';

    return 'nuclear';
  }

  private assignCulturalRoles(members: FamilyMember[]): Map<string, CulturalFamilyRole> {
    const roles = new Map<string, CulturalFamilyRole>();

    members.forEach(member => {
      // Eldest male often family head in traditional families
      if (member.gender === 'male' && member.ageGroup === 'elder') {
        roles.set(member.id, 'family_head');
      }

      // Primary caregivers
      if (member.primaryCaregiver) {
        roles.set(member.id, 'primary_caregiver');
      }

      // Elders have advisory roles
      if (member.ageGroup === 'elder' && !roles.has(member.id)) {
        roles.set(member.id, 'elder');
      }

      // Parents are decision makers for minor children
      if (member.relationship === 'parent') {
        if (!roles.has(member.id)) {
          roles.set(member.id, 'decision_maker');
        }
      }

      // Others are support members
      if (!roles.has(member.id)) {
        roles.set(member.id, 'support_member');
      }
    });

    return roles;
  }

  private buildFamilyHierarchy(members: FamilyMember[]): FamilyHierarchy {
    const hierarchy: FamilyHierarchy = {
      levels: [],
      respectOrder: [],
      decisionAuthority: new Map(),
      culturalSeniority: new Map()
    };

    // Level 1: Grandparents
    const grandparents = members.filter(m => m.relationship === 'grandparent');
    if (grandparents.length > 0) {
      hierarchy.levels.push({
        level: 1,
        members: grandparents.map(m => m.id),
        role: 'Elder Generation',
        culturalSignificance: 'Highest respect and consultation'
      });
    }

    // Level 2: Parents and their siblings
    const parents = members.filter(m =>
      ['parent', 'aunt_uncle'].includes(m.relationship)
    );
    if (parents.length > 0) {
      hierarchy.levels.push({
        level: 2,
        members: parents.map(m => m.id),
        role: 'Parent Generation',
        culturalSignificance: 'Primary decision makers'
      });
    }

    // Level 3: Current generation
    const currentGen = members.filter(m =>
      ['spouse', 'sibling', 'cousin'].includes(m.relationship)
    );
    if (currentGen.length > 0) {
      hierarchy.levels.push({
        level: 3,
        members: currentGen.map(m => m.id),
        role: 'Current Generation',
        culturalSignificance: 'Collaborative support'
      });
    }

    // Level 4: Children
    const children = members.filter(m =>
      ['child', 'grandchild'].includes(m.relationship)
    );
    if (children.length > 0) {
      hierarchy.levels.push({
        level: 4,
        members: children.map(m => m.id),
        role: 'Younger Generation',
        culturalSignificance: 'Care recipients'
      });
    }

    // Build respect order (elders first, then by age within generation)
    hierarchy.respectOrder = hierarchy.levels
      .flatMap(level => level.members)
      .sort((a, b) => {
        const memberA = members.find(m => m.id === a);
        const memberB = members.find(m => m.id === b);
        if (!memberA || !memberB) return 0;

        // Sort by age group priority
        const agePriority = { elder: 0, adult: 1, young_adult: 2, adolescent: 3, child: 4 };
        return (agePriority[memberA.ageGroup] || 5) - (agePriority[memberB.ageGroup] || 5);
      });

    // Assign decision authority (1-10 scale)
    members.forEach(member => {
      let authority = 5; // Base authority

      if (member.ageGroup === 'elder') authority += 3;
      if (member.ageGroup === 'adult') authority += 2;
      if (member.relationship === 'parent') authority += 2;
      if (member.culturalRole === 'family_head') authority = 10;
      if (member.culturalRole === 'primary_caregiver') authority += 1;
      if (member.ageGroup === 'child') authority = 1;

      hierarchy.decisionAuthority.set(member.id, Math.min(10, authority));
      hierarchy.culturalSeniority.set(member.id, authority);
    });

    return hierarchy;
  }

  private determineDecisionPattern(members: FamilyMember[]): DecisionMakingPattern {
    const elderCount = members.filter(m => m.ageGroup === 'elder').length;
    const hasPatriarch = members.some(m =>
      m.gender === 'male' && m.culturalRole === 'family_head'
    );
    const hasMatriarch = members.some(m =>
      m.gender === 'female' && m.culturalRole === 'family_head'
    );

    if (elderCount > 0 && elderCount >= members.length * 0.3) {
      return 'elder_led';
    }

    if (hasPatriarch) return 'patriarchal';
    if (hasMatriarch) return 'matriarchal';

    // Modern families tend toward collective or democratic
    const adultCount = members.filter(m =>
      ['adult', 'young_adult', 'elder'].includes(m.ageGroup)
    ).length;

    if (adultCount > 3) return 'collective';

    return 'democratic';
  }

  private assignCaregivingRoles(members: FamilyMember[]): Map<string, string[]> {
    const caregiving = new Map<string, string[]>();

    members.forEach(member => {
      const careFor: string[] = [];

      // Parents care for children
      if (member.relationship === 'parent') {
        const children = members.filter(m => m.relationship === 'child');
        careFor.push(...children.map(c => c.id));
      }

      // Adult children care for elderly parents
      if (member.relationship === 'child' && ['adult', 'young_adult'].includes(member.ageGroup)) {
        const elderlyParents = members.filter(m =>
          m.relationship === 'parent' && m.ageGroup === 'elder'
        );
        careFor.push(...elderlyParents.map(p => p.id));
      }

      // Spouses care for each other
      if (member.relationship === 'spouse') {
        const otherSpouse = members.find(m =>
          m.relationship === 'spouse' && m.id !== member.id
        );
        if (otherSpouse) careFor.push(otherSpouse.id);
      }

      // Elder siblings may care for younger ones
      if (member.relationship === 'elder_sibling') {
        const youngerSiblings = members.filter(m =>
          m.relationship === 'younger_sibling'
        );
        careFor.push(...youngerSiblings.map(s => s.id));
      }

      if (careFor.length > 0) {
        caregiving.set(member.id, careFor);
      }
    });

    return caregiving;
  }

  private determineCulturalPreferences(members: FamilyMember[]): FamilyCulturalPreferences {
    // Analyze family composition to determine preferences
    const religiousMembers = members.filter(m => m.religiousAffiliation);
    const elderMembers = members.filter(m => m.ageGroup === 'elder');

    return {
      religiousObservance: religiousMembers.length > members.length * 0.7 ? 'moderate' : 'flexible',
      genderInteractionRules: this.determineGenderRules(members),
      elderRespectProtocol: {
        consultationRequired: elderMembers.length > 0,
        vetoAuthority: elderMembers.some(m => m.culturalRole === 'family_head'),
        informationFiltering: true, // Common in Malaysian culture
        honorificsRequired: true,
        specialPrivileges: ['priority_consultation', 'decision_veto', 'information_control']
      },
      healthcareDecisionMaking: {
        pattern: this.determineHealthcareDecisionPattern(members),
        requiredConsultations: elderMembers.length > 0 ? ['parent', 'grandparent'] : ['spouse'],
        emergencyDecisionMaker: members.find(m => m.primaryCaregiver)?.id,
        culturalConsiderations: ['halal_medication', 'prayer_time_scheduling', 'family_presence']
      },
      privacyExpectations: this.determinePrivacyExpectations(),
      communicationStyle: {
        directness: 'indirect', // Malaysian tendency toward indirect communication
        formality: elderMembers.length > 0 ? 'formal' : 'mixed',
        languageHierarchy: new Map([
          ['elder_sibling', 'formal'],
          ['parent', 'formal'],
          ['grandparent', 'formal'],
          ['younger_sibling', 'informal']
        ]),
        sensitiveTopicApproach: 'indirect'
      },
      emergencyProtocol: {
        primaryContact: members.find(m => m.primaryCaregiver)?.id || '',
        notificationOrder: members
          .filter(m => ['adult', 'elder'].includes(m.ageGroup))
          .map(m => m.id),
        culturalConsiderations: ['family_presence_required', 'elder_consultation', 'religious_support'],
        religiousRequirements: ['halal_requirements', 'prayer_space'],
        hospitalPreference: 'nearest_malaysian_hospital'
      }
    };
  }

  private identifyFamilyHead(
    members: FamilyMember[],
    structure: MalaysianFamilyStructure
  ): FamilyMember | undefined {
    // Check if explicitly assigned
    const explicitHead = members.find(m => m.culturalRole === 'family_head');
    if (explicitHead) return explicitHead;

    // Traditional pattern: eldest male
    const eldestMale = members
      .filter(m => m.gender === 'male' && ['elder', 'adult'].includes(m.ageGroup))
      .sort((a, b) => {
        const agePriority = { elder: 0, adult: 1, young_adult: 2 };
        return (agePriority[a.ageGroup] || 3) - (agePriority[b.ageGroup] || 3);
      })[0];

    if (eldestMale) return eldestMale;

    // Alternative: eldest female if no suitable male
    const eldestFemale = members
      .filter(m => m.gender === 'female' && ['elder', 'adult'].includes(m.ageGroup))
      .sort((a, b) => {
        const agePriority = { elder: 0, adult: 1, young_adult: 2 };
        return (agePriority[a.ageGroup] || 3) - (agePriority[b.ageGroup] || 3);
      })[0];

    return eldestFemale;
  }

  private validateElderRespect(
    structure: MalaysianFamilyStructure,
    privacySettings: any
  ): boolean {
    const elders = structure.members.filter(m => m.ageGroup === 'elder');
    if (elders.length === 0) return true;

    // Check if elders have appropriate access
    for (const elder of elders) {
      const hasAccess = privacySettings.familyMemberPermissions?.some(
        (p: any) => p.memberId === elder.id && p.permissions.length > 0
      );
      if (!hasAccess) return false;
    }

    return true;
  }

  private validateGenderAppropriate(
    structure: MalaysianFamilyStructure,
    privacySettings: any
  ): { valid: boolean; concern?: string; mitigation?: string } {
    if (!structure.culturalPreferences.genderInteractionRules?.sameSexCaregiverPreferred) {
      return { valid: true };
    }

    // Check for cross-gender sensitive data sharing
    const sensitiveCategories = ['medical_conditions', 'health_metrics'];

    for (const permission of privacySettings.familyMemberPermissions || []) {
      const member = structure.members.find(m => m.id === permission.memberId);
      const owner = structure.members.find(m => m.id === privacySettings.userId);

      if (!member || !owner) continue;

      if (member.gender !== owner.gender) {
        const hasSensitiveAccess = permission.permissions.some(
          (p: any) => sensitiveCategories.includes(p.resource)
        );

        if (hasSensitiveAccess && !permission.culturalOverride) {
          return {
            valid: false,
            concern: 'Cross-gender sharing of sensitive medical information',
            mitigation: 'Consider same-gender caregiver for sensitive health data'
          };
        }
      }
    }

    return { valid: true };
  }

  private validateReligiousConsiderations(
    structure: MalaysianFamilyStructure,
    privacySettings: any
  ): boolean {
    if (structure.culturalPreferences.religiousObservance === 'secular') {
      return true;
    }

    // Check if religious preferences are respected
    const hasReligiousConsiderations = privacySettings.culturalPreferences?.religiousConsiderations;

    return hasReligiousConsiderations?.length > 0;
  }

  private determineGenderRules(members: FamilyMember[]): GenderInteractionRules | undefined {
    const hasStrictReligious = members.some(m =>
      m.religiousAffiliation === 'islamic' && m.ageGroup !== 'child'
    );

    if (!hasStrictReligious) return undefined;

    return {
      sameSexCaregiverPreferred: true,
      genderSeparateDiscussions: false,
      chaperoneRequired: false,
      exceptions: ['emergency', 'spouse', 'parent-child']
    };
  }

  private determineHealthcareDecisionPattern(members: FamilyMember[]): 'individual' | 'spousal' | 'parental' | 'collective' | 'elder_guided' {
    const elderCount = members.filter(m => m.ageGroup === 'elder').length;
    const adultCount = members.filter(m => ['adult', 'young_adult'].includes(m.ageGroup)).length;

    if (elderCount > 0 && elderCount >= adultCount * 0.5) {
      return 'elder_guided';
    }

    if (adultCount > 3) {
      return 'collective';
    }

    const hasSpouse = members.some(m => m.relationship === 'spouse');
    if (hasSpouse) {
      return 'spousal';
    }

    return 'individual';
  }

  private determinePrivacyExpectations(): PrivacyExpectation[] {
    return [
      {
        category: 'medications',
        sharingLevel: 'restricted',
        culturalReason: 'Medication information shared with immediate family only',
        ageBasedRules: new Map([
          ['child', 'Parents have full access'],
          ['adolescent', 'Parents have supervised access'],
          ['adult', 'Spouse and emergency contacts only'],
          ['elder', 'Primary caregiver and adult children']
        ])
      },
      {
        category: 'medical_conditions',
        sharingLevel: 'private',
        culturalReason: 'Sensitive health conditions kept private to avoid stigma',
        ageBasedRules: new Map([
          ['elder', 'May prefer to shield family from serious diagnoses']
        ])
      },
      {
        category: 'appointments',
        sharingLevel: 'open',
        culturalReason: 'Family coordination for transportation and accompaniment'
      }
    ];
  }

  private updateCulturalPatterns(context: any): void {
    // Update patterns based on cultural context changes
    this.emit('patterns:updated', {
      context,
      timestamp: new Date()
    });
  }

  // Malaysian-specific pattern loaders

  private loadMalayPattern(): void {
    const pattern: HealthcareCulturalPattern = {
      medicationAdherence: {
        ramadanAdjustments: true,
        halalRequirements: true,
        traditionalMedicineIntegration: true,
        familyMedicationSharing: false,
        elderSupervision: true
      },
      appointmentPatterns: {
        familyAccompaniment: 'often',
        genderPreferences: true,
        prayerTimeAvoidance: true,
        festivalConsiderations: true,
        transportationSharing: true
      },
      healthBeliefs: {
        fateAcceptance: 'medium',
        spiritualHealing: true,
        collectiveWellbeing: true,
        preventionFocus: 'medium',
        westernMedicineAcceptance: 'full'
      },
      familyInvolvement: {
        level: 'high',
        decisionParticipation: ['spouse', 'parents', 'elder_siblings'],
        informationSharing: 'selective',
        caregivingDistribution: new Map()
      }
    };

    this.culturalPatterns.set('malay', pattern);
  }

  private loadChinesePattern(): void {
    const pattern: HealthcareCulturalPattern = {
      medicationAdherence: {
        ramadanAdjustments: false,
        halalRequirements: false,
        traditionalMedicineIntegration: true, // TCM integration
        familyMedicationSharing: true,
        elderSupervision: true
      },
      appointmentPatterns: {
        familyAccompaniment: 'often',
        genderPreferences: false,
        prayerTimeAvoidance: false,
        festivalConsiderations: true, // CNY, Mooncake Festival
        transportationSharing: true
      },
      healthBeliefs: {
        fateAcceptance: 'medium',
        spiritualHealing: false,
        collectiveWellbeing: true,
        preventionFocus: 'high',
        westernMedicineAcceptance: 'full'
      },
      familyInvolvement: {
        level: 'high',
        decisionParticipation: ['spouse', 'parents', 'eldest_son'],
        informationSharing: 'full',
        caregivingDistribution: new Map()
      }
    };

    this.culturalPatterns.set('chinese', pattern);
  }

  private loadIndianPattern(): void {
    const pattern: HealthcareCulturalPattern = {
      medicationAdherence: {
        ramadanAdjustments: false,
        halalRequirements: false, // May have vegetarian requirements
        traditionalMedicineIntegration: true, // Ayurveda
        familyMedicationSharing: false,
        elderSupervision: true
      },
      appointmentPatterns: {
        familyAccompaniment: 'always',
        genderPreferences: true,
        prayerTimeAvoidance: false,
        festivalConsiderations: true, // Deepavali, Thaipusam
        transportationSharing: true
      },
      healthBeliefs: {
        fateAcceptance: 'high',
        spiritualHealing: true,
        collectiveWellbeing: true,
        preventionFocus: 'medium',
        westernMedicineAcceptance: 'partial'
      },
      familyInvolvement: {
        level: 'high',
        decisionParticipation: ['spouse', 'parents', 'extended_family'],
        informationSharing: 'selective',
        caregivingDistribution: new Map()
      }
    };

    this.culturalPatterns.set('indian', pattern);
  }

  private loadMixedPattern(): void {
    // For multicultural families
    const pattern: HealthcareCulturalPattern = {
      medicationAdherence: {
        ramadanAdjustments: false,
        halalRequirements: false,
        traditionalMedicineIntegration: false,
        familyMedicationSharing: false,
        elderSupervision: true
      },
      appointmentPatterns: {
        familyAccompaniment: 'sometimes',
        genderPreferences: false,
        prayerTimeAvoidance: false,
        festivalConsiderations: true,
        transportationSharing: true
      },
      healthBeliefs: {
        fateAcceptance: 'low',
        spiritualHealing: false,
        collectiveWellbeing: true,
        preventionFocus: 'high',
        westernMedicineAcceptance: 'full'
      },
      familyInvolvement: {
        level: 'medium',
        decisionParticipation: ['spouse'],
        informationSharing: 'selective',
        caregivingDistribution: new Map()
      }
    };

    this.culturalPatterns.set('mixed', pattern);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.removeAllListeners();
    this.familyStructures.clear();
    this.culturalPatterns.clear();
  }
}

// Export singleton instance
export const culturalFamilyPatterns = CulturalFamilyPatternsService.getInstance();
export default culturalFamilyPatterns;