/**
 * FHIR Family Resource Integration Models
 * Implements FHIR R4 standard for family health information exchange
 * Supports Malaysian healthcare provider integration requirements
 */

import { Service, Inject } from 'typedi';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * FHIR R4 RelatedPerson Resource
 * Represents family members and their relationships
 * https://www.hl7.org/fhir/relatedperson.html
 */
export interface FHIRRelatedPerson {
  resourceType: 'RelatedPerson';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  active?: boolean;
  patient: FHIRReference; // Reference to Patient
  relationship?: FHIRCodeableConcept[];
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: FHIRAddress[];
  photo?: FHIRAttachment[];
  period?: FHIRPeriod;
  communication?: FHIRCommunication[];
}

/**
 * FHIR R4 FamilyMemberHistory Resource
 * Records family health history for genetic and risk assessment
 */
export interface FHIRFamilyMemberHistory {
  resourceType: 'FamilyMemberHistory';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  status: 'partial' | 'completed' | 'entered-in-error' | 'health-unknown';
  dataAbsentReason?: FHIRCodeableConcept;
  patient: FHIRReference; // Reference to Patient
  date?: string;
  name?: string;
  relationship: FHIRCodeableConcept;
  sex?: FHIRCodeableConcept;
  bornPeriod?: FHIRPeriod;
  bornDate?: string;
  bornString?: string;
  ageAge?: FHIRAge;
  ageRange?: FHIRRange;
  ageString?: string;
  estimatedAge?: boolean;
  deceasedBoolean?: boolean;
  deceasedAge?: FHIRAge;
  deceasedRange?: FHIRRange;
  deceasedDate?: string;
  deceasedString?: string;
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  note?: FHIRAnnotation[];
  condition?: FHIRFamilyMemberCondition[];
}

/**
 * FHIR R4 Group Resource
 * Represents a family circle or care team
 */
export interface FHIRGroup {
  resourceType: 'Group';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  active?: boolean;
  type: 'person' | 'animal' | 'practitioner' | 'device' | 'medication' | 'substance';
  actual: boolean;
  code?: FHIRCodeableConcept;
  name?: string;
  quantity?: number;
  managingEntity?: FHIRReference; // Reference to Organization or Practitioner
  characteristic?: FHIRGroupCharacteristic[];
  member?: FHIRGroupMember[];
}

/**
 * FHIR R4 Consent Resource
 * Manages privacy and data sharing consent
 */
export interface FHIRConsent {
  resourceType: 'Consent';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';
  scope: FHIRCodeableConcept;
  category: FHIRCodeableConcept[];
  patient?: FHIRReference; // Reference to Patient
  dateTime?: string;
  performer?: FHIRReference[]; // Who is agreeing to the policy
  organization?: FHIRReference[]; // Custodian of the consent
  sourceAttachment?: FHIRAttachment;
  sourceReference?: FHIRReference;
  policy?: FHIRConsentPolicy[];
  policyRule?: FHIRCodeableConcept;
  verification?: FHIRConsentVerification[];
  provision?: FHIRConsentProvision;
}

/**
 * FHIR R4 CareTeam Resource
 * Represents family caregivers and healthcare providers
 */
export interface FHIRCareTeam {
  resourceType: 'CareTeam';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  status?: 'proposed' | 'active' | 'suspended' | 'inactive' | 'entered-in-error';
  category?: FHIRCodeableConcept[];
  name?: string;
  subject?: FHIRReference; // Reference to Patient or Group
  encounter?: FHIRReference;
  period?: FHIRPeriod;
  participant?: FHIRCareTeamParticipant[];
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  managingOrganization?: FHIRReference[];
  telecom?: FHIRContactPoint[];
  note?: FHIRAnnotation[];
}

/**
 * Malaysian Healthcare Provider Integration
 * Extensions for local healthcare system requirements
 */
export interface MalaysianFHIRExtensions {
  // Malaysian Medical Council Registration
  mmcNumber?: string;

  // Ministry of Health facility code
  mohFacilityCode?: string;

  // MySejahtera integration ID
  mySejahteraId?: string;

  // PEKA B40 program identifier
  pekaB40Id?: string;

  // Cultural family role
  culturalFamilyRole?: MalaysianFamilyRole;

  // PDPA consent reference
  pdpaConsentId?: string;

  // Language preference for healthcare communication
  languagePreference?: 'ms' | 'en' | 'zh' | 'ta';

  // Malaysian IC number (encrypted)
  encryptedIcNumber?: string;

  // Healthcare insurance provider
  insuranceProvider?: MalaysianInsuranceProvider;
}

export type MalaysianFamilyRole =
  | 'ketua_keluarga' // Head of household
  | 'suami' // Husband
  | 'isteri' // Wife
  | 'anak' // Child
  | 'ibu_bapa' // Parent
  | 'datuk_nenek' // Grandparent
  | 'adik_beradik' // Sibling
  | 'saudara_terdekat' // Close relative
  | 'penjaga' // Caregiver;

export type MalaysianInsuranceProvider =
  | 'government' // Government healthcare
  | 'perkeso' // SOCSO
  | 'mysalam'
  | 'skim_peduli_kesihatan'
  | 'private_insurance';

// Supporting FHIR data types

export interface FHIRMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FHIRCoding[];
  tag?: FHIRCoding[];
}

export interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FHIRCodeableConcept;
  system?: string;
  value?: string;
  period?: FHIRPeriod;
  assigner?: FHIRReference;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

export interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FHIRPeriod;
}

export interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FHIRPeriod;
}

export interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FHIRPeriod;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRAttachment {
  contentType?: string;
  language?: string;
  data?: string; // Base64
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

export interface FHIRCommunication {
  language: FHIRCodeableConcept;
  preferred?: boolean;
}

export interface FHIRAge {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
}

export interface FHIRQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRAnnotation {
  authorReference?: FHIRReference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface FHIRFamilyMemberCondition {
  code: FHIRCodeableConcept;
  outcome?: FHIRCodeableConcept;
  contributedToDeath?: boolean;
  onsetAge?: FHIRAge;
  onsetRange?: FHIRRange;
  onsetPeriod?: FHIRPeriod;
  onsetString?: string;
  note?: FHIRAnnotation[];
}

export interface FHIRGroupCharacteristic {
  code: FHIRCodeableConcept;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueBoolean?: boolean;
  valueQuantity?: FHIRQuantity;
  valueRange?: FHIRRange;
  valueReference?: FHIRReference;
  exclude: boolean;
  period?: FHIRPeriod;
}

export interface FHIRGroupMember {
  entity: FHIRReference;
  period?: FHIRPeriod;
  inactive?: boolean;
}

export interface FHIRConsentPolicy {
  authority?: string;
  uri?: string;
}

export interface FHIRConsentVerification {
  verified: boolean;
  verifiedWith?: FHIRReference;
  verificationDate?: string;
}

export interface FHIRConsentProvision {
  type?: 'deny' | 'permit';
  period?: FHIRPeriod;
  actor?: FHIRConsentActor[];
  action?: FHIRCodeableConcept[];
  securityLabel?: FHIRCoding[];
  purpose?: FHIRCoding[];
  class?: FHIRCoding[];
  code?: FHIRCodeableConcept[];
  dataPeriod?: FHIRPeriod;
  data?: FHIRConsentData[];
  provision?: FHIRConsentProvision[];
}

export interface FHIRConsentActor {
  role: FHIRCodeableConcept;
  reference: FHIRReference;
}

export interface FHIRConsentData {
  meaning: 'instance' | 'related' | 'dependents' | 'authoredby';
  reference: FHIRReference;
}

export interface FHIRCareTeamParticipant {
  role?: FHIRCodeableConcept[];
  member?: FHIRReference;
  onBehalfOf?: FHIRReference;
  period?: FHIRPeriod;
}

/**
 * FHIR Family Integration Service
 * Handles conversion between internal models and FHIR resources
 */
@Service()
export class FHIRFamilyIntegrationService {
  private readonly FHIR_SYNC_TIMEOUT = 2000; // 2 seconds performance target

  constructor(
    @Inject('logger') private logger: Logger
  ) {}

  /**
   * Convert internal family member to FHIR RelatedPerson
   */
  toFHIRRelatedPerson(
    familyMember: any,
    patientId: string,
    extensions?: MalaysianFHIRExtensions
  ): FHIRRelatedPerson {
    const relatedPerson: FHIRRelatedPerson = {
      resourceType: 'RelatedPerson',
      id: familyMember.id || uuidv4(),
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/RelatedPerson']
      },
      active: familyMember.status === 'active',
      patient: {
        reference: `Patient/${patientId}`,
        display: familyMember.patientName
      },
      relationship: this.mapRelationshipToFHIR(familyMember.relationship, extensions?.culturalFamilyRole),
      name: [{
        use: 'official',
        text: familyMember.fullName,
        family: familyMember.lastName,
        given: [familyMember.firstName]
      }],
      telecom: this.mapContactPointsToFHIR(familyMember.contactInfo),
      gender: familyMember.gender,
      birthDate: familyMember.birthDate,
      address: this.mapAddressToFHIR(familyMember.address),
      communication: this.mapCommunicationPreferences(extensions?.languagePreference)
    };

    // Add Malaysian extensions
    if (extensions) {
      this.addMalaysianExtensions(relatedPerson, extensions);
    }

    return relatedPerson;
  }

  /**
   * Convert internal family circle to FHIR Group
   */
  toFHIRGroup(familyCircle: any, extensions?: MalaysianFHIRExtensions): FHIRGroup {
    const group: FHIRGroup = {
      resourceType: 'Group',
      id: familyCircle.id || uuidv4(),
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Group']
      },
      active: true,
      type: 'person',
      actual: true,
      code: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/group-type',
          code: 'family',
          display: 'Family'
        }],
        text: 'Family Circle'
      },
      name: familyCircle.name,
      quantity: familyCircle.members?.length || 0,
      member: this.mapFamilyMembersToFHIR(familyCircle.members)
    };

    // Add Malaysian healthcare provider reference if applicable
    if (extensions?.mohFacilityCode) {
      group.managingEntity = {
        reference: `Organization/${extensions.mohFacilityCode}`,
        display: 'Malaysian Healthcare Facility'
      };
    }

    return group;
  }

  /**
   * Convert privacy consent to FHIR Consent
   */
  toFHIRConsent(privacyConsent: any, patientId: string, extensions?: MalaysianFHIRExtensions): FHIRConsent {
    const consent: FHIRConsent = {
      resourceType: 'Consent',
      id: privacyConsent.consentId || uuidv4(),
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Consent']
      },
      status: 'active',
      scope: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/consentscope',
          code: 'patient-privacy',
          display: 'Privacy Consent'
        }]
      },
      category: [{
        coding: [{
          system: 'http://loinc.org',
          code: '59284-0',
          display: 'Patient Consent'
        }]
      }],
      patient: {
        reference: `Patient/${patientId}`
      },
      dateTime: privacyConsent.consentDate,
      policy: this.mapPDPAPolicyToFHIR(extensions?.pdpaConsentId),
      provision: this.mapPrivacyProvisionsToFHIR(privacyConsent)
    };

    return consent;
  }

  /**
   * Convert family caregivers to FHIR CareTeam
   */
  toFHIRCareTeam(familyCircle: any, patientId: string, extensions?: MalaysianFHIRExtensions): FHIRCareTeam {
    const careTeam: FHIRCareTeam = {
      resourceType: 'CareTeam',
      id: uuidv4(),
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/CareTeam']
      },
      status: 'active',
      category: [{
        coding: [{
          system: 'http://loinc.org',
          code: 'LA28865-6',
          display: 'Family'
        }]
      }],
      name: `${familyCircle.name} Care Team`,
      subject: {
        reference: `Patient/${patientId}`
      },
      participant: this.mapFamilyCaregiversToFHIR(familyCircle.members, extensions)
    };

    return careTeam;
  }

  /**
   * Convert FHIR RelatedPerson back to internal model
   */
  fromFHIRRelatedPerson(relatedPerson: FHIRRelatedPerson): any {
    return {
      id: relatedPerson.id,
      status: relatedPerson.active ? 'active' : 'inactive',
      patientId: this.extractIdFromReference(relatedPerson.patient.reference),
      relationship: this.mapFHIRRelationshipToInternal(relatedPerson.relationship),
      fullName: relatedPerson.name?.[0]?.text,
      firstName: relatedPerson.name?.[0]?.given?.[0],
      lastName: relatedPerson.name?.[0]?.family,
      gender: relatedPerson.gender,
      birthDate: relatedPerson.birthDate,
      contactInfo: this.mapFHIRContactPointsToInternal(relatedPerson.telecom),
      address: this.mapFHIRAddressToInternal(relatedPerson.address),
      lastUpdated: relatedPerson.meta?.lastUpdated
    };
  }

  /**
   * Validate FHIR resource compliance
   */
  validateFHIRResource(resource: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check resource type
    if (!resource.resourceType) {
      errors.push('Missing resourceType');
    }

    // Check required fields based on resource type
    switch (resource.resourceType) {
      case 'RelatedPerson':
        if (!resource.patient) {
          errors.push('RelatedPerson must have a patient reference');
        }
        break;
      case 'Group':
        if (!resource.type || !resource.actual) {
          errors.push('Group must have type and actual fields');
        }
        break;
      case 'Consent':
        if (!resource.status || !resource.scope || !resource.category) {
          errors.push('Consent must have status, scope, and category');
        }
        break;
      case 'CareTeam':
        if (!resource.subject) {
          errors.push('CareTeam must have a subject reference');
        }
        break;
    }

    // Validate Malaysian extensions if present
    if (resource.extension) {
      this.validateMalaysianExtensions(resource.extension, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Private helper methods

  private mapRelationshipToFHIR(
    relationship: string,
    culturalRole?: MalaysianFamilyRole
  ): FHIRCodeableConcept[] {
    const concepts: FHIRCodeableConcept[] = [];

    // Standard FHIR relationship
    concepts.push({
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: this.getFHIRRelationshipCode(relationship),
        display: relationship
      }]
    });

    // Add Malaysian cultural role if provided
    if (culturalRole) {
      concepts.push({
        coding: [{
          system: 'http://malaysia.health.gov.my/CodeSystem/family-role',
          code: culturalRole,
          display: this.getMalaysianRoleDisplay(culturalRole)
        }]
      });
    }

    return concepts;
  }

  private getFHIRRelationshipCode(relationship: string): string {
    const mappings: Record<string, string> = {
      'spouse': 'SPS',
      'parent': 'PRN',
      'child': 'CHILD',
      'grandparent': 'GRPRN',
      'sibling': 'SIB',
      'aunt_uncle': 'AUNT',
      'cousin': 'COUSN'
    };
    return mappings[relationship] || 'FAMMEMB';
  }

  private getMalaysianRoleDisplay(role: MalaysianFamilyRole): string {
    const displays: Record<MalaysianFamilyRole, string> = {
      'ketua_keluarga': 'Head of Household',
      'suami': 'Husband',
      'isteri': 'Wife',
      'anak': 'Child',
      'ibu_bapa': 'Parent',
      'datuk_nenek': 'Grandparent',
      'adik_beradik': 'Sibling',
      'saudara_terdekat': 'Close Relative',
      'penjaga': 'Caregiver'
    };
    return displays[role];
  }

  private mapContactPointsToFHIR(contactInfo: any): FHIRContactPoint[] {
    if (!contactInfo) return [];

    const points: FHIRContactPoint[] = [];

    if (contactInfo.phone) {
      points.push({
        system: 'phone',
        value: contactInfo.phone,
        use: 'mobile'
      });
    }

    if (contactInfo.email) {
      points.push({
        system: 'email',
        value: contactInfo.email,
        use: 'home'
      });
    }

    return points;
  }

  private mapAddressToFHIR(address: any): FHIRAddress[] {
    if (!address) return [];

    return [{
      use: 'home',
      type: 'physical',
      text: address.fullAddress,
      line: [address.streetAddress],
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: 'MYS' // Malaysia ISO code
    }];
  }

  private mapCommunicationPreferences(languagePreference?: string): FHIRCommunication[] {
    if (!languagePreference) return [];

    const languageMappings: Record<string, { code: string; display: string }> = {
      'ms': { code: 'ms-MY', display: 'Malay' },
      'en': { code: 'en-MY', display: 'English' },
      'zh': { code: 'zh-CN', display: 'Chinese' },
      'ta': { code: 'ta-MY', display: 'Tamil' }
    };

    const mapping = languageMappings[languagePreference];
    if (!mapping) return [];

    return [{
      language: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: mapping.code,
          display: mapping.display
        }]
      },
      preferred: true
    }];
  }

  private addMalaysianExtensions(resource: any, extensions: MalaysianFHIRExtensions): void {
    resource.extension = resource.extension || [];

    if (extensions.mmcNumber) {
      resource.extension.push({
        url: 'http://malaysia.health.gov.my/StructureDefinition/mmc-number',
        valueString: extensions.mmcNumber
      });
    }

    if (extensions.mohFacilityCode) {
      resource.extension.push({
        url: 'http://malaysia.health.gov.my/StructureDefinition/moh-facility-code',
        valueString: extensions.mohFacilityCode
      });
    }

    if (extensions.mySejahteraId) {
      resource.extension.push({
        url: 'http://malaysia.health.gov.my/StructureDefinition/mysejahtera-id',
        valueString: extensions.mySejahteraId
      });
    }

    if (extensions.pekaB40Id) {
      resource.extension.push({
        url: 'http://malaysia.health.gov.my/StructureDefinition/peka-b40-id',
        valueString: extensions.pekaB40Id
      });
    }
  }

  private mapFamilyMembersToFHIR(members: any[]): FHIRGroupMember[] {
    if (!members) return [];

    return members.map(member => ({
      entity: {
        reference: `Patient/${member.userId}`,
        display: member.name
      },
      period: member.joinedAt ? {
        start: member.joinedAt
      } : undefined,
      inactive: member.status !== 'active'
    }));
  }

  private mapPDPAPolicyToFHIR(pdpaConsentId?: string): FHIRConsentPolicy[] {
    const policies: FHIRConsentPolicy[] = [{
      authority: 'https://www.pdp.gov.my',
      uri: 'https://www.pdp.gov.my/jpdpn/assets/files/PDPA_2010_Act_709.pdf'
    }];

    if (pdpaConsentId) {
      policies.push({
        uri: `https://medimate.my/consent/${pdpaConsentId}`
      });
    }

    return policies;
  }

  private mapPrivacyProvisionsToFHIR(privacyConsent: any): FHIRConsentProvision {
    return {
      type: 'permit',
      period: privacyConsent.validPeriod,
      purpose: privacyConsent.purposes?.map((p: any) => ({
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
        code: this.mapPurposeToFHIR(p.purpose),
        display: p.description
      })),
      data: privacyConsent.dataCategories?.map((cat: any) => ({
        meaning: 'instance',
        reference: {
          display: cat.category
        }
      }))
    };
  }

  private mapPurposeToFHIR(purpose: string): string {
    const purposeMappings: Record<string, string> = {
      'medication_management': 'TREAT',
      'family_sharing': 'FAMRQT',
      'healthcare_coordination': 'CAREMGT',
      'emergency_access': 'ETREAT'
    };
    return purposeMappings[purpose] || 'HPAYMT';
  }

  private mapFamilyCaregiversToFHIR(
    members: any[],
    extensions?: MalaysianFHIRExtensions
  ): FHIRCareTeamParticipant[] {
    if (!members) return [];

    return members
      .filter(m => m.role === 'caregiver' || m.role === 'primary_caregiver')
      .map(member => ({
        role: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/participant-role',
            code: member.role === 'primary_caregiver' ? 'primary' : 'alternate',
            display: member.role === 'primary_caregiver' ? 'Primary Caregiver' : 'Family Caregiver'
          }]
        }],
        member: {
          reference: `RelatedPerson/${member.id}`,
          display: member.name
        },
        period: member.joinedAt ? {
          start: member.joinedAt
        } : undefined
      }));
  }

  private extractIdFromReference(reference?: string): string | undefined {
    if (!reference) return undefined;
    const parts = reference.split('/');
    return parts[parts.length - 1];
  }

  private mapFHIRRelationshipToInternal(relationships?: FHIRCodeableConcept[]): string {
    if (!relationships || relationships.length === 0) return 'family_member';

    const firstCoding = relationships[0].coding?.[0];
    if (!firstCoding) return 'family_member';

    const reverseMappings: Record<string, string> = {
      'SPS': 'spouse',
      'PRN': 'parent',
      'CHILD': 'child',
      'GRPRN': 'grandparent',
      'SIB': 'sibling',
      'AUNT': 'aunt_uncle',
      'COUSN': 'cousin'
    };

    return reverseMappings[firstCoding.code || ''] || 'family_member';
  }

  private mapFHIRContactPointsToInternal(telecom?: FHIRContactPoint[]): any {
    if (!telecom) return {};

    const contactInfo: any = {};

    telecom.forEach(point => {
      if (point.system === 'phone') {
        contactInfo.phone = point.value;
      } else if (point.system === 'email') {
        contactInfo.email = point.value;
      }
    });

    return contactInfo;
  }

  private mapFHIRAddressToInternal(addresses?: FHIRAddress[]): any {
    if (!addresses || addresses.length === 0) return null;

    const address = addresses[0];
    return {
      fullAddress: address.text,
      streetAddress: address.line?.[0],
      city: address.city,
      state: address.state,
      postalCode: address.postalCode
    };
  }

  private validateMalaysianExtensions(
    extensions: any[],
    errors: string[],
    warnings: string[]
  ): void {
    extensions.forEach(ext => {
      if (ext.url?.includes('malaysia.health.gov.my')) {
        // Validate Malaysian-specific extensions
        if (ext.url.includes('mmc-number') && !ext.valueString?.match(/^\d{5,}$/)) {
          errors.push('Invalid MMC number format');
        }
        if (ext.url.includes('ic-number') && !ext.valueString) {
          warnings.push('Missing IC number for Malaysian patient');
        }
      }
    });
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}