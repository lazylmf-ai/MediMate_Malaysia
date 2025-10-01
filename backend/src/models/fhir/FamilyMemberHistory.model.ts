/**
 * FHIR FamilyMemberHistory Resource Model
 * Malaysian Healthcare Profile Implementation
 *
 * Represents family health history information for provider integration
 * Compliant with FHIR R4 and Malaysian healthcare standards
 */

import {
  FamilyMemberHistory as FHIRFamilyMemberHistory,
  CodeableConcept,
  Reference,
  Identifier,
  Period,
  Age,
  Range,
  Annotation
} from 'fhir/r4';
import { FamilyMember, CulturalContext } from '../../types/family/family.types';

export interface MalaysianFamilyMemberHistory extends FHIRFamilyMemberHistory {
  // Malaysian-specific extensions
  culturalContext?: CulturalFamilyContext;
  privacySettings?: FamilyPrivacySettings;
  malaysianHealthIdentifier?: string;
}

export interface CulturalFamilyContext {
  familyStructure: 'nuclear' | 'extended' | 'multi-generational';
  culturalRole: string; // e.g., 'eldest_son', 'matriarch', 'caregiver'
  religiousConsiderations?: {
    religion: 'islamic' | 'christian' | 'buddhist' | 'hindu' | 'other';
    dietaryRestrictions?: string[];
    medicationRestrictions?: string[];
  };
  languagePreference: 'ms' | 'en' | 'zh' | 'ta';
}

export interface FamilyPrivacySettings {
  dataSharing: {
    withProviders: boolean;
    withFamilyMembers: boolean;
    emergencyOnly: boolean;
  };
  consentDate: Date;
  pdpaCompliant: boolean;
  culturalPrivacy: {
    respectGenderBoundaries: boolean;
    elderApprovalRequired: boolean;
  };
}

export class FamilyMemberHistoryModel {
  /**
   * Convert internal family member to FHIR FamilyMemberHistory
   */
  static toFHIR(
    familyMember: FamilyMember,
    patientReference: string,
    culturalContext?: CulturalContext
  ): MalaysianFamilyMemberHistory {
    const history: MalaysianFamilyMemberHistory = {
      resourceType: 'FamilyMemberHistory',
      id: familyMember.id,
      meta: {
        profile: ['http://moh.gov.my/fhir/StructureDefinition/family-member-history']
      },
      identifier: [{
        system: 'http://medimate.my/family-member',
        value: familyMember.id
      }],
      status: familyMember.status === 'active' ? 'completed' : 'entered-in-error',
      patient: {
        reference: `Patient/${patientReference}`,
        display: familyMember.displayName
      },
      date: new Date().toISOString(),
      relationship: this.mapRelationshipCode(familyMember.relationship),
      name: familyMember.displayName,
      // Malaysian cultural extensions
      culturalContext: this.mapCulturalContext(familyMember, culturalContext),
      privacySettings: this.mapPrivacySettings(familyMember)
    };

    // Add Malaysian health identifier if available
    if (familyMember.userId) {
      history.malaysianHealthIdentifier = `MYH-${familyMember.userId}`;
    }

    return history;
  }

  /**
   * Map family relationship to FHIR CodeableConcept
   */
  private static mapRelationshipCode(relationship: string): CodeableConcept {
    const relationshipMap: Record<string, { code: string; display: string }> = {
      'parent': { code: 'FTH', display: 'Father' },
      'mother': { code: 'MTH', display: 'Mother' },
      'spouse': { code: 'SPS', display: 'Spouse' },
      'child': { code: 'CHILD', display: 'Child' },
      'sibling': { code: 'SIB', display: 'Sibling' },
      'grandparent': { code: 'GRPRN', display: 'Grandparent' },
      'grandchild': { code: 'GRNDDAU', display: 'Granddaughter' },
      'aunt': { code: 'AUNT', display: 'Aunt' },
      'uncle': { code: 'UNCLE', display: 'Uncle' },
      'cousin': { code: 'COUSN', display: 'Cousin' },
      'guardian': { code: 'GUARD', display: 'Guardian' },
      'caregiver': { code: 'CARE', display: 'Caregiver' }
    };

    const mapped = relationshipMap[relationship.toLowerCase()] || {
      code: 'FAMMEMB',
      display: 'Family Member'
    };

    return {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: mapped.code,
        display: mapped.display
      }],
      text: relationship
    };
  }

  /**
   * Map cultural context for Malaysian families
   */
  private static mapCulturalContext(
    familyMember: FamilyMember,
    culturalContext?: CulturalContext
  ): CulturalFamilyContext {
    const context: CulturalFamilyContext = {
      familyStructure: this.determineFamilyStructure(familyMember),
      culturalRole: this.determineCulturalRole(familyMember),
      languagePreference: this.getLanguagePreference(familyMember)
    };

    if (culturalContext) {
      context.religiousConsiderations = this.mapReligiousConsiderations(culturalContext);
    }

    return context;
  }

  /**
   * Determine family structure type
   */
  private static determineFamilyStructure(familyMember: FamilyMember): 'nuclear' | 'extended' | 'multi-generational' {
    const extendedRelations = ['grandparent', 'aunt', 'uncle', 'cousin'];
    const relationship = familyMember.relationship.toLowerCase();

    if (extendedRelations.includes(relationship)) {
      return 'extended';
    }

    if (relationship.includes('grand')) {
      return 'multi-generational';
    }

    return 'nuclear';
  }

  /**
   * Determine cultural role in Malaysian family context
   */
  private static determineCulturalRole(familyMember: FamilyMember): string {
    const { relationship, culturalContext } = familyMember;
    const respectLevel = culturalContext?.respectLevel || 'standard';

    // Malaysian cultural role mapping
    if (relationship === 'parent' && respectLevel === 'high') {
      return 'family_elder';
    }

    if (relationship === 'spouse') {
      return 'life_partner';
    }

    if (familyMember.role === 'caregiver') {
      return 'primary_caregiver';
    }

    if (relationship === 'grandparent') {
      return 'family_patriarch_matriarch';
    }

    return relationship;
  }

  /**
   * Get language preference from family member
   */
  private static getLanguagePreference(familyMember: FamilyMember): 'ms' | 'en' | 'zh' | 'ta' {
    // Default to Malay for Malaysian context
    return 'ms';
  }

  /**
   * Map religious considerations for Malaysian context
   */
  private static mapReligiousConsiderations(culturalContext: CulturalContext) {
    const religionMap: Record<string, 'islamic' | 'christian' | 'buddhist' | 'hindu' | 'other'> = {
      'direct': 'islamic', // Default for Malaysian context
      'indirect': 'buddhist',
      'formal': 'hindu'
    };

    return {
      religion: religionMap[culturalContext.communicationPreference] || 'other',
      dietaryRestrictions: this.getDietaryRestrictions(culturalContext),
      medicationRestrictions: this.getMedicationRestrictions(culturalContext)
    };
  }

  /**
   * Get dietary restrictions based on cultural context
   */
  private static getDietaryRestrictions(culturalContext: CulturalContext): string[] {
    const restrictions: string[] = [];

    if (culturalContext.communicationPreference === 'direct') {
      restrictions.push('halal_only', 'no_pork', 'no_alcohol');
    }

    if (culturalContext.communicationPreference === 'formal') {
      restrictions.push('vegetarian_options', 'no_beef');
    }

    return restrictions;
  }

  /**
   * Get medication restrictions based on cultural context
   */
  private static getMedicationRestrictions(culturalContext: CulturalContext): string[] {
    const restrictions: string[] = [];

    if (culturalContext.communicationPreference === 'direct') {
      restrictions.push('no_porcine_derived', 'no_alcohol_based');
    }

    return restrictions;
  }

  /**
   * Map privacy settings for PDPA compliance
   */
  private static mapPrivacySettings(familyMember: FamilyMember): FamilyPrivacySettings {
    const { privacySettings, culturalContext } = familyMember;

    return {
      dataSharing: {
        withProviders: privacySettings?.shareHealthMetrics || false,
        withFamilyMembers: privacySettings?.shareMedications || false,
        emergencyOnly: privacySettings?.emergencyOverride || false
      },
      consentDate: familyMember.updatedAt,
      pdpaCompliant: true,
      culturalPrivacy: {
        respectGenderBoundaries: culturalContext?.respectLevel === 'high',
        elderApprovalRequired: culturalContext?.communicationPreference === 'formal'
      }
    };
  }

  /**
   * Convert FHIR FamilyMemberHistory to internal format
   */
  static fromFHIR(
    fhirHistory: MalaysianFamilyMemberHistory,
    familyId: string
  ): Partial<FamilyMember> {
    return {
      id: fhirHistory.id,
      familyId,
      displayName: fhirHistory.name,
      relationship: fhirHistory.relationship?.text || 'Family Member',
      status: fhirHistory.status === 'completed' ? 'active' : 'suspended',
      privacySettings: this.extractPrivacySettings(fhirHistory),
      culturalContext: this.extractCulturalContext(fhirHistory)
    };
  }

  /**
   * Extract privacy settings from FHIR resource
   */
  private static extractPrivacySettings(fhirHistory: MalaysianFamilyMemberHistory) {
    const settings = fhirHistory.privacySettings;

    return {
      shareMedications: settings?.dataSharing.withFamilyMembers || false,
      shareAdherence: settings?.dataSharing.withFamilyMembers || false,
      shareHealthMetrics: settings?.dataSharing.withProviders || false,
      shareLocation: false,
      emergencyOverride: settings?.dataSharing.emergencyOnly || false
    };
  }

  /**
   * Extract cultural context from FHIR resource
   */
  private static extractCulturalContext(fhirHistory: MalaysianFamilyMemberHistory) {
    const context = fhirHistory.culturalContext;

    return {
      respectLevel: context?.culturalRole.includes('elder') ? 'high' as const : 'standard' as const,
      communicationPreference: 'direct' as const,
      emergencyContactPriority: 1
    };
  }

  /**
   * Create FHIR Bundle for family members
   */
  static createFamilyBundle(
    familyMembers: FamilyMember[],
    patientReference: string
  ): Bundle {
    const entries = familyMembers.map(member => ({
      fullUrl: `urn:uuid:${member.id}`,
      resource: this.toFHIR(member, patientReference),
      request: {
        method: 'POST' as const,
        url: 'FamilyMemberHistory'
      }
    }));

    return {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: entries,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate family member history for Malaysian compliance
   */
  static validateForMalaysianCompliance(history: MalaysianFamilyMemberHistory): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required Malaysian identifiers
    if (!history.identifier?.some(id => id.system?.includes('medimate.my'))) {
      warnings.push('Missing MediMate family member identifier');
    }

    // Validate cultural context
    if (!history.culturalContext) {
      warnings.push('Cultural context not specified for Malaysian family member');
    }

    // Validate privacy settings
    if (!history.privacySettings?.pdpaCompliant) {
      errors.push('PDPA compliance not confirmed for family member');
    }

    // Check relationship mapping
    if (!history.relationship?.coding?.length) {
      errors.push('Family relationship not properly coded');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default FamilyMemberHistoryModel;