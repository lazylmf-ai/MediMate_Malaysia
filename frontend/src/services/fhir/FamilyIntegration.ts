/**
 * FHIR Family Resource Integration Service
 * Implements FHIR R4 standard for Malaysian healthcare provider integration
 * Manages family health information exchange with privacy controls
 */

import { EventEmitter } from 'events';
import { apiClient } from '../../api/client';
import { privacyManager } from '../family/PrivacyManager';
import { culturalFamilyPatterns } from '../family/CulturalFamilyPatterns';

// FHIR R4 Resource Types
export interface FHIRRelatedPerson {
  resourceType: 'RelatedPerson';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  active?: boolean;
  patient: FHIRReference;
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

export interface FHIRFamilyMemberHistory {
  resourceType: 'FamilyMemberHistory';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  status: 'partial' | 'completed' | 'entered-in-error' | 'health-unknown';
  dataAbsentReason?: FHIRCodeableConcept;
  patient: FHIRReference;
  date?: string;
  name?: string;
  relationship: FHIRCodeableConcept;
  sex?: FHIRCodeableConcept;
  born?: FHIRPeriod | string;
  age?: FHIRAge | FHIRRange | string;
  estimatedAge?: boolean;
  deceased?: boolean | FHIRAge | FHIRRange | string;
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  note?: FHIRAnnotation[];
  condition?: FHIRFamilyMemberCondition[];
}

export interface FHIRConsent {
  resourceType: 'Consent';
  id: string;
  meta?: FHIRMeta;
  identifier?: FHIRIdentifier[];
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';
  scope: FHIRCodeableConcept;
  category: FHIRCodeableConcept[];
  patient?: FHIRReference;
  dateTime?: string;
  performer?: FHIRReference[];
  organization?: FHIRReference[];
  source?: FHIRAttachment | FHIRReference;
  policy?: FHIRConsentPolicy[];
  policyRule?: FHIRCodeableConcept;
  verification?: FHIRConsentVerification[];
  provision?: FHIRConsentProvision;
}

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
  managingEntity?: FHIRReference;
  characteristic?: FHIRGroupCharacteristic[];
  member?: FHIRGroupMember[];
}

// Supporting FHIR Types
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

export interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
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

export interface FHIRAttachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRCommunication {
  language: FHIRCodeableConcept;
  preferred?: boolean;
}

export interface FHIRAge {
  value?: number;
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
  onset?: FHIRAge | FHIRRange | FHIRPeriod | string;
  note?: FHIRAnnotation[];
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

export interface FHIRGroupCharacteristic {
  code: FHIRCodeableConcept;
  value: FHIRCodeableConcept | boolean | FHIRQuantity | FHIRRange | FHIRReference;
  exclude: boolean;
  period?: FHIRPeriod;
}

export interface FHIRGroupMember {
  entity: FHIRReference;
  period?: FHIRPeriod;
  inactive?: boolean;
}

// Malaysian Healthcare Integration Types
export interface MalaysianProviderIntegration {
  providerId: string;
  providerName: string;
  providerType: 'hospital' | 'clinic' | 'specialist' | 'pharmacy';
  integrationLevel: 'basic' | 'standard' | 'comprehensive';
  supportedResources: string[];
  malaysianCompliance: {
    mohRegistered: boolean;
    pdpaCompliant: boolean;
    mysejahteraIntegrated: boolean;
  };
  culturalSupport: {
    multiLanguage: boolean;
    languages: string[];
    culturallyAware: boolean;
  };
}

export interface FamilySyncRequest {
  familyId: string;
  providerId: string;
  resources: string[];
  syncType: 'full' | 'incremental' | 'emergency';
  culturalContext?: any;
  privacyLevel: 'full' | 'limited' | 'emergency_only';
}

export interface FamilySyncResponse {
  success: boolean;
  syncId: string;
  timestamp: Date;
  resourcesSynced: number;
  errors?: string[];
  nextSyncScheduled?: Date;
}

class FHIRFamilyIntegrationService extends EventEmitter {
  private static instance: FHIRFamilyIntegrationService;
  private providers: Map<string, MalaysianProviderIntegration> = new Map();
  private syncQueue: FamilySyncRequest[] = [];
  private syncInProgress = false;
  private readonly SYNC_TIMEOUT = 2000; // 2 seconds target
  private readonly BATCH_SIZE = 10; // Resources per batch

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): FHIRFamilyIntegrationService {
    if (!FHIRFamilyIntegrationService.instance) {
      FHIRFamilyIntegrationService.instance = new FHIRFamilyIntegrationService();
    }
    return FHIRFamilyIntegrationService.instance;
  }

  private async initialize(): Promise<void> {
    await this.loadProviders();
    this.setupSyncProcessor();
  }

  private async loadProviders(): Promise<void> {
    try {
      const response = await apiClient.get('/api/fhir/providers');
      response.data.providers.forEach((provider: MalaysianProviderIntegration) => {
        this.providers.set(provider.providerId, provider);
      });
    } catch (error) {
      console.error('Failed to load FHIR providers:', error);
    }
  }

  private setupSyncProcessor(): void {
    // Process sync queue every 5 seconds
    setInterval(() => {
      this.processSyncQueue();
    }, 5000);
  }

  /**
   * Create FHIR RelatedPerson resource for family member
   */
  async createRelatedPerson(
    patientId: string,
    familyMember: any,
    relationship: string
  ): Promise<FHIRRelatedPerson | null> {
    try {
      const relatedPerson: FHIRRelatedPerson = {
        resourceType: 'RelatedPerson',
        id: `related-person-${familyMember.id}`,
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/RelatedPerson'],
          tag: [{
            system: 'http://medimate.my/tags',
            code: 'malaysian-family',
            display: 'Malaysian Family Member'
          }]
        },
        active: true,
        patient: {
          reference: `Patient/${patientId}`,
          display: 'Family Patient'
        },
        relationship: [
          {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
              code: this.mapRelationshipCode(relationship),
              display: relationship
            }],
            text: this.getRelationshipDisplay(relationship)
          }
        ],
        name: [{
          use: 'official',
          text: familyMember.name,
          family: familyMember.lastName,
          given: [familyMember.firstName]
        }],
        telecom: this.mapContactPoints(familyMember),
        gender: familyMember.gender as 'male' | 'female',
        birthDate: familyMember.birthDate,
        address: this.mapAddress(familyMember.address),
        communication: this.mapCommunication(familyMember.languages)
      };

      const response = await apiClient.post('/api/fhir/related-person', relatedPerson);
      return response.data;
    } catch (error) {
      console.error('Failed to create RelatedPerson:', error);
      return null;
    }
  }

  /**
   * Create FHIR FamilyMemberHistory for genetic/risk assessment
   */
  async createFamilyMemberHistory(
    patientId: string,
    familyHistory: any
  ): Promise<FHIRFamilyMemberHistory | null> {
    try {
      const history: FHIRFamilyMemberHistory = {
        resourceType: 'FamilyMemberHistory',
        id: `family-history-${familyHistory.id}`,
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/FamilyMemberHistory'],
          tag: [{
            system: 'http://medimate.my/tags',
            code: 'malaysian-family-history'
          }]
        },
        status: 'completed',
        patient: {
          reference: `Patient/${patientId}`
        },
        date: new Date().toISOString(),
        name: familyHistory.memberName,
        relationship: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
            code: this.mapRelationshipCode(familyHistory.relationship)
          }],
          text: familyHistory.relationship
        },
        sex: {
          coding: [{
            system: 'http://hl7.org/fhir/administrative-gender',
            code: familyHistory.gender
          }]
        },
        condition: this.mapConditions(familyHistory.conditions)
      };

      if (familyHistory.birthDate) {
        history.born = familyHistory.birthDate;
      }

      if (familyHistory.deceased) {
        history.deceased = familyHistory.deceasedDate || true;
      }

      const response = await apiClient.post('/api/fhir/family-history', history);
      return response.data;
    } catch (error) {
      console.error('Failed to create FamilyMemberHistory:', error);
      return null;
    }
  }

  /**
   * Create FHIR Consent for family data sharing
   */
  async createFamilyConsent(
    patientId: string,
    familyId: string,
    sharingPreferences: any
  ): Promise<FHIRConsent | null> {
    try {
      // Get privacy settings for cultural validation
      const privacySettings = await privacyManager.getPrivacySettings(patientId, familyId);
      if (!privacySettings) return null;

      const consent: FHIRConsent = {
        resourceType: 'Consent',
        id: `consent-${patientId}-${familyId}`,
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/Consent'],
          security: [{
            system: 'http://medimate.my/security',
            code: 'PDPA',
            display: 'Malaysian PDPA Compliant'
          }]
        },
        status: 'active',
        scope: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/consentscope',
            code: 'patient-privacy',
            display: 'Privacy Consent'
          }]
        },
        category: [
          {
            coding: [{
              system: 'http://loinc.org',
              code: '59284-0',
              display: 'Patient Consent'
            }]
          },
          {
            coding: [{
              system: 'http://medimate.my/consent-category',
              code: 'family-sharing',
              display: 'Family Data Sharing Consent'
            }]
          }
        ],
        patient: {
          reference: `Patient/${patientId}`
        },
        dateTime: new Date().toISOString(),
        organization: [{
          reference: `Organization/${sharingPreferences.providerId}`,
          display: sharingPreferences.providerName
        }],
        policy: [{
          authority: 'https://www.pdp.gov.my',
          uri: 'https://www.pdp.gov.my/jpdpv2/akta-709'
        }],
        provision: this.createConsentProvision(privacySettings, sharingPreferences)
      };

      const response = await apiClient.post('/api/fhir/consent', consent);
      return response.data;
    } catch (error) {
      console.error('Failed to create Consent:', error);
      return null;
    }
  }

  /**
   * Create FHIR Group for family circle
   */
  async createFamilyGroup(
    familyId: string,
    familyMembers: any[]
  ): Promise<FHIRGroup | null> {
    try {
      const group: FHIRGroup = {
        resourceType: 'Group',
        id: `family-group-${familyId}`,
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/Group'],
          tag: [{
            system: 'http://medimate.my/tags',
            code: 'malaysian-family-circle'
          }]
        },
        active: true,
        type: 'person',
        actual: true,
        code: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
            code: 'FAMMEMB',
            display: 'Family Member'
          }],
          text: 'Malaysian Family Circle'
        },
        name: `Family Circle ${familyId}`,
        quantity: familyMembers.length,
        characteristic: this.createFamilyCharacteristics(familyMembers),
        member: familyMembers.map(member => ({
          entity: {
            reference: `Patient/${member.patientId}`,
            display: member.name
          },
          period: {
            start: member.joinDate
          },
          inactive: member.status !== 'active'
        }))
      };

      const response = await apiClient.post('/api/fhir/group', group);
      return response.data;
    } catch (error) {
      console.error('Failed to create Family Group:', error);
      return null;
    }
  }

  /**
   * Sync family data with healthcare provider
   */
  async syncFamilyData(request: FamilySyncRequest): Promise<FamilySyncResponse> {
    const startTime = Date.now();

    try {
      // Validate provider
      const provider = this.providers.get(request.providerId);
      if (!provider) {
        throw new Error(`Provider ${request.providerId} not found`);
      }

      // Check privacy permissions
      const hasPermission = await this.validateSyncPermissions(
        request.familyId,
        request.providerId,
        request.privacyLevel
      );

      if (!hasPermission) {
        return {
          success: false,
          syncId: '',
          timestamp: new Date(),
          resourcesSynced: 0,
          errors: ['Insufficient privacy permissions for sync']
        };
      }

      // Add to sync queue for batch processing
      this.syncQueue.push(request);

      // Process immediately if not already processing
      if (!this.syncInProgress) {
        await this.processSyncQueue();
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > this.SYNC_TIMEOUT) {
        console.warn(`FHIR sync took ${elapsed}ms, exceeding target`);
      }

      return {
        success: true,
        syncId: `sync-${Date.now()}`,
        timestamp: new Date(),
        resourcesSynced: request.resources.length,
        nextSyncScheduled: new Date(Date.now() + 3600000) // 1 hour
      };
    } catch (error) {
      console.error('Family data sync failed:', error);
      return {
        success: false,
        syncId: '',
        timestamp: new Date(),
        resourcesSynced: 0,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Get Malaysian healthcare provider details
   */
  async getProvider(providerId: string): Promise<MalaysianProviderIntegration | null> {
    if (this.providers.has(providerId)) {
      return this.providers.get(providerId)!;
    }

    try {
      const response = await apiClient.get(`/api/fhir/providers/${providerId}`);
      const provider = response.data;
      this.providers.set(providerId, provider);
      return provider;
    } catch (error) {
      console.error('Failed to fetch provider:', error);
      return null;
    }
  }

  /**
   * Validate FHIR resources against Malaysian standards
   */
  async validateMalaysianCompliance(resource: any): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for required Malaysian identifiers
    if (!resource.identifier?.some((id: any) =>
      id.system === 'http://fhir.moh.gov.my/CodeSystem/malaysian-identification'
    )) {
      issues.push('Missing Malaysian identification (IC/Passport)');
      recommendations.push('Add patient Malaysian IC or passport number');
    }

    // Check for cultural markers
    if (!resource.meta?.tag?.some((tag: any) =>
      tag.system === 'http://medimate.my/tags'
    )) {
      issues.push('Missing Malaysian context tags');
      recommendations.push('Add appropriate Malaysian healthcare tags');
    }

    // Check for language support
    if (resource.resourceType === 'RelatedPerson' || resource.resourceType === 'Patient') {
      if (!resource.communication?.some((comm: any) =>
        ['ms', 'en', 'zh', 'ta'].includes(comm.language?.coding?.[0]?.code)
      )) {
        issues.push('Missing Malaysian language preference');
        recommendations.push('Specify patient language preference (MS/EN/ZH/TA)');
      }
    }

    // Check for PDPA compliance markers
    if (resource.resourceType === 'Consent') {
      if (!resource.policy?.some((policy: any) =>
        policy.authority === 'https://www.pdp.gov.my'
      )) {
        issues.push('Missing PDPA compliance reference');
        recommendations.push('Add Malaysian PDPA policy reference');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Private helper methods

  private mapRelationshipCode(relationship: string): string {
    const mapping: Record<string, string> = {
      'spouse': 'SPS',
      'parent': 'PRN',
      'child': 'CHILD',
      'grandparent': 'GRPRN',
      'grandchild': 'GRNDCHILD',
      'sibling': 'SIB',
      'elder_sibling': 'SIB',
      'younger_sibling': 'SIB',
      'aunt_uncle': 'AUNT',
      'cousin': 'COUSN',
      'in_law': 'INLAW',
      'extended_family': 'EXT'
    };
    return mapping[relationship] || 'EXT';
  }

  private getRelationshipDisplay(relationship: string): string {
    const displays: Record<string, string> = {
      'spouse': 'Spouse/Pasangan',
      'parent': 'Parent/Ibu Bapa',
      'child': 'Child/Anak',
      'grandparent': 'Grandparent/Datuk Nenek',
      'grandchild': 'Grandchild/Cucu',
      'elder_sibling': 'Elder Sibling/Abang Kakak',
      'younger_sibling': 'Younger Sibling/Adik',
      'aunt_uncle': 'Aunt/Uncle/Mak Cik Pak Cik',
      'cousin': 'Cousin/Sepupu'
    };
    return displays[relationship] || relationship;
  }

  private mapContactPoints(member: any): FHIRContactPoint[] {
    const points: FHIRContactPoint[] = [];

    if (member.phone) {
      points.push({
        system: 'phone',
        value: member.phone,
        use: member.phoneType || 'mobile'
      });
    }

    if (member.email) {
      points.push({
        system: 'email',
        value: member.email,
        use: 'home'
      });
    }

    return points;
  }

  private mapAddress(address: any): FHIRAddress[] {
    if (!address) return [];

    return [{
      use: 'home',
      type: 'physical',
      text: address.fullAddress,
      line: [address.line1, address.line2].filter(Boolean),
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: 'MY'
    }];
  }

  private mapCommunication(languages: string[]): FHIRCommunication[] {
    if (!languages || languages.length === 0) return [];

    const languageMap: Record<string, string> = {
      'ms': 'Malay',
      'en': 'English',
      'zh': 'Chinese',
      'ta': 'Tamil'
    };

    return languages.map((lang, index) => ({
      language: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: lang,
          display: languageMap[lang] || lang
        }]
      },
      preferred: index === 0
    }));
  }

  private mapConditions(conditions: any[]): FHIRFamilyMemberCondition[] {
    if (!conditions || conditions.length === 0) return [];

    return conditions.map(condition => ({
      code: {
        coding: [{
          system: condition.system || 'http://snomed.info/sct',
          code: condition.code,
          display: condition.display
        }],
        text: condition.text
      },
      outcome: condition.outcome ? {
        coding: [{
          system: 'http://snomed.info/sct',
          code: condition.outcomeCode,
          display: condition.outcome
        }]
      } : undefined,
      contributedToDeath: condition.contributedToDeath,
      onset: condition.onsetAge ? {
        value: condition.onsetAge,
        unit: 'years',
        system: 'http://unitsofmeasure.org',
        code: 'a'
      } : condition.onsetDate,
      note: condition.notes ? [{
        text: condition.notes
      }] : undefined
    }));
  }

  private createConsentProvision(privacySettings: any, sharingPreferences: any): FHIRConsentProvision {
    const provision: FHIRConsentProvision = {
      type: 'permit',
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      },
      actor: [],
      action: [],
      purpose: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
          code: 'FAMRQT',
          display: 'Family Requested'
        },
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
          code: 'TREAT',
          display: 'Treatment'
        }
      ],
      class: sharingPreferences.resourceTypes?.map((type: string) => ({
        system: 'http://hl7.org/fhir/resource-types',
        code: type
      })) || []
    };

    // Add family member actors based on privacy settings
    if (privacySettings.familyMemberPermissions) {
      privacySettings.familyMemberPermissions.forEach((permission: any) => {
        provision.actor?.push({
          role: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
              code: this.mapRelationshipCode(permission.relationship),
              display: permission.relationship
            }]
          },
          reference: {
            reference: `RelatedPerson/${permission.memberId}`
          }
        });
      });
    }

    // Add data restrictions based on privacy level
    if (sharingPreferences.privacyLevel === 'limited') {
      provision.securityLabel = [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-Confidentiality',
        code: 'R',
        display: 'Restricted'
      }];
    }

    return provision;
  }

  private createFamilyCharacteristics(familyMembers: any[]): FHIRGroupCharacteristic[] {
    const characteristics: FHIRGroupCharacteristic[] = [];

    // Family structure type
    const familyType = culturalFamilyPatterns.analyzeFamilyStructure(familyMembers).type;
    characteristics.push({
      code: {
        coding: [{
          system: 'http://medimate.my/family-structure',
          code: familyType,
          display: `Malaysian ${familyType} family`
        }]
      },
      value: true,
      exclude: false
    });

    // Cultural background
    const culturalBackgrounds = new Set(familyMembers.map(m => m.culturalBackground).filter(Boolean));
    culturalBackgrounds.forEach(background => {
      characteristics.push({
        code: {
          coding: [{
            system: 'http://medimate.my/cultural-background',
            code: background,
            display: `${background} cultural background`
          }]
        },
        value: true,
        exclude: false
      });
    });

    // Primary language
    const languages = familyMembers.map(m => m.primaryLanguage).filter(Boolean);
    const primaryLanguage = languages.length > 0 ?
      languages.reduce((a, b) => languages.filter(v => v === a).length >= languages.filter(v => v === b).length ? a : b) :
      'ms';

    characteristics.push({
      code: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: primaryLanguage,
          display: 'Primary family language'
        }]
      },
      value: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: primaryLanguage
        }]
      },
      exclude: false
    });

    return characteristics;
  }

  private async validateSyncPermissions(
    familyId: string,
    providerId: string,
    privacyLevel: string
  ): Promise<boolean> {
    // Check if provider is authorized
    const provider = this.providers.get(providerId);
    if (!provider || !provider.malaysianCompliance.pdpaCompliant) {
      return false;
    }

    // Check privacy settings allow this level of sharing
    // This would integrate with the privacy manager
    return true; // Simplified for now
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Process in batches
      while (this.syncQueue.length > 0) {
        const batch = this.syncQueue.splice(0, this.BATCH_SIZE);

        await Promise.all(batch.map(async (request) => {
          try {
            const response = await apiClient.post('/api/fhir/sync-batch', {
              requests: [request]
            });

            this.emit('sync:completed', {
              familyId: request.familyId,
              providerId: request.providerId,
              success: response.data.success
            });
          } catch (error) {
            console.error('Batch sync failed:', error);
            this.emit('sync:failed', {
              familyId: request.familyId,
              providerId: request.providerId,
              error
            });
          }
        }));
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.removeAllListeners();
    this.providers.clear();
    this.syncQueue = [];
  }
}

// Export singleton instance
export const fhirFamilyIntegration = FHIRFamilyIntegrationService.getInstance();
export default fhirFamilyIntegration;