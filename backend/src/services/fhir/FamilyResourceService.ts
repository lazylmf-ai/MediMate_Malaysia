/**
 * FHIR Family Resource Service
 * Manages FHIR R4 compliant family resource integration for Malaysian healthcare providers
 * Supports bidirectional data exchange with MOH and private healthcare systems
 */

import { Service, Inject } from 'typedi';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Bundle,
  FamilyMemberHistory,
  RelatedPerson,
  Group,
  Consent,
  Patient,
  Reference,
  CodeableConcept,
  Identifier,
  HumanName,
  ContactPoint,
  Address
} from 'fhir/r4';
import { DatabaseService } from '../database/database.service';
import { PrivacyControlService } from '../privacy/privacy-control.service';
import { CulturalService } from '../cultural/cultural.service';
import { AuditService } from '../audit/audit.service';

export interface FHIRFamilyBundle {
  bundle: Bundle;
  familyId: string;
  timestamp: Date;
  privacyCompliant: boolean;
  culturallyValidated: boolean;
}

export interface ProviderSyncResult {
  success: boolean;
  providerId: string;
  resourcesSynced: number;
  errors?: string[];
  timestamp: Date;
}

export interface FamilyResourceConfig {
  includeHealthHistory: boolean;
  includeRelationships: boolean;
  includeConsent: boolean;
  culturalAdaptation: boolean;
  malaysianProfile: boolean;
}

@Service()
export class FamilyResourceService extends EventEmitter {
  private readonly SYNC_TIMEOUT = 2000; // 2 seconds performance target
  private readonly RESOURCE_VERSION = '4.0.1'; // FHIR R4

  // Malaysian healthcare provider endpoints
  private readonly MOH_ENDPOINT = process.env.MOH_FHIR_ENDPOINT || 'https://api.moh.gov.my/fhir';
  private readonly PRIVATE_PROVIDERS: Map<string, string> = new Map([
    ['KPJ', 'https://api.kpj.com.my/fhir'],
    ['IHH', 'https://api.ihhhealthcare.com/fhir'],
    ['SUNWAY', 'https://api.sunwaymedical.com/fhir']
  ]);

  constructor(
    @Inject('logger') private logger: Logger,
    @Inject() private db: DatabaseService,
    @Inject() private privacy: PrivacyControlService,
    @Inject() private cultural: CulturalService,
    @Inject() private audit: AuditService
  ) {
    super();
    this.initializeProviderConnections();
    this.setupEventHandlers();
  }

  /**
   * Initialize healthcare provider connections
   */
  private async initializeProviderConnections(): Promise<void> {
    try {
      // Validate MOH connection
      await this.validateProviderEndpoint(this.MOH_ENDPOINT);

      // Validate private provider connections
      for (const [provider, endpoint] of this.PRIVATE_PROVIDERS) {
        await this.validateProviderEndpoint(endpoint);
        this.logger.info(`Provider ${provider} FHIR endpoint validated: ${endpoint}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize provider connections', error);
    }
  }

  /**
   * Setup event handlers for FHIR synchronization
   */
  private setupEventHandlers(): void {
    this.on('family:updated', async (data) => {
      await this.handleFamilyUpdate(data);
    });

    this.on('consent:changed', async (data) => {
      await this.handleConsentChange(data);
    });

    this.on('provider:sync_requested', async (data) => {
      await this.handleProviderSync(data);
    });
  }

  /**
   * Create FHIR Bundle for family circle
   */
  async createFamilyBundle(
    familyId: string,
    config: FamilyResourceConfig
  ): Promise<FHIRFamilyBundle> {
    const startTime = Date.now();

    try {
      // Get family data from database
      const familyData = await this.getFamilyData(familyId);

      // Check privacy permissions
      const privacyCheck = await this.privacy.checkFHIRSharingPermissions(familyId);
      if (!privacyCheck.allowed) {
        throw new Error(`FHIR sharing not permitted: ${privacyCheck.reason}`);
      }

      // Create FHIR Bundle
      const bundle: Bundle = {
        resourceType: 'Bundle',
        id: uuidv4(),
        meta: {
          lastUpdated: new Date().toISOString(),
          profile: config.malaysianProfile
            ? ['http://moh.gov.my/fhir/StructureDefinition/family-bundle']
            : undefined
        },
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: []
      };

      // Add family group resource
      const familyGroup = await this.createFamilyGroup(familyData);
      bundle.entry?.push({
        fullUrl: `urn:uuid:${familyGroup.id}`,
        resource: familyGroup
      });

      // Add related persons
      if (config.includeRelationships) {
        const relatedPersons = await this.createRelatedPersons(familyData);
        relatedPersons.forEach(person => {
          bundle.entry?.push({
            fullUrl: `urn:uuid:${person.id}`,
            resource: person
          });
        });
      }

      // Add family member histories
      if (config.includeHealthHistory) {
        const histories = await this.createFamilyMemberHistories(familyData);
        histories.forEach(history => {
          bundle.entry?.push({
            fullUrl: `urn:uuid:${history.id}`,
            resource: history
          });
        });
      }

      // Add consent resources
      if (config.includeConsent) {
        const consents = await this.createConsentResources(familyData);
        consents.forEach(consent => {
          bundle.entry?.push({
            fullUrl: `urn:uuid:${consent.id}`,
            resource: consent
          });
        });
      }

      // Apply cultural adaptations
      if (config.culturalAdaptation) {
        await this.applyCulturalAdaptations(bundle, familyData);
      }

      // Validate bundle
      const validationResult = await this.validateFHIRBundle(bundle);
      if (!validationResult.valid) {
        throw new Error(`Bundle validation failed: ${validationResult.errors?.join(', ')}`);
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > this.SYNC_TIMEOUT) {
        this.logger.warn(`Family bundle creation took ${elapsed}ms, exceeding target`);
      }

      // Audit FHIR bundle creation
      await this.audit.logFHIRActivity({
        familyId,
        action: 'bundle_created',
        resourceCount: bundle.entry?.length || 0,
        timestamp: new Date()
      });

      return {
        bundle,
        familyId,
        timestamp: new Date(),
        privacyCompliant: privacyCheck.compliant,
        culturallyValidated: config.culturalAdaptation
      };
    } catch (error) {
      this.logger.error('Failed to create family bundle', error);
      throw error;
    }
  }

  /**
   * Sync family data with healthcare provider
   */
  async syncWithProvider(
    familyId: string,
    providerId: string,
    config?: Partial<FamilyResourceConfig>
  ): Promise<ProviderSyncResult> {
    const startTime = Date.now();

    try {
      // Get provider endpoint
      const endpoint = this.getProviderEndpoint(providerId);
      if (!endpoint) {
        throw new Error(`Provider ${providerId} not configured`);
      }

      // Check privacy permissions for provider
      const privacyCheck = await this.privacy.checkProviderSharingPermission(
        familyId,
        providerId
      );
      if (!privacyCheck.allowed) {
        throw new Error(`Provider sharing not permitted: ${privacyCheck.reason}`);
      }

      // Create FHIR bundle with provider-specific configuration
      const bundleConfig: FamilyResourceConfig = {
        includeHealthHistory: config?.includeHealthHistory ?? true,
        includeRelationships: config?.includeRelationships ?? true,
        includeConsent: config?.includeConsent ?? true,
        culturalAdaptation: config?.culturalAdaptation ?? true,
        malaysianProfile: providerId === 'MOH'
      };

      const familyBundle = await this.createFamilyBundle(familyId, bundleConfig);

      // Send bundle to provider
      const response = await this.sendBundleToProvider(
        familyBundle.bundle,
        endpoint,
        providerId
      );

      // Process provider response
      const syncResult = await this.processSyncResponse(response, providerId);

      const elapsed = Date.now() - startTime;
      if (elapsed > this.SYNC_TIMEOUT) {
        this.logger.warn(`Provider sync took ${elapsed}ms, exceeding target`);
      }

      // Audit provider sync
      await this.audit.logFHIRSync({
        familyId,
        providerId,
        resourceCount: familyBundle.bundle.entry?.length || 0,
        success: syncResult.success,
        timestamp: new Date()
      });

      this.emit('provider:sync_completed', {
        familyId,
        providerId,
        result: syncResult
      });

      return syncResult;
    } catch (error) {
      this.logger.error(`Failed to sync with provider ${providerId}`, error);

      return {
        success: false,
        providerId,
        resourcesSynced: 0,
        errors: [error.message],
        timestamp: new Date()
      };
    }
  }

  /**
   * Create FHIR Group resource for family circle
   */
  private async createFamilyGroup(familyData: any): Promise<Group> {
    const group: Group = {
      resourceType: 'Group',
      id: uuidv4(),
      meta: {
        profile: ['http://moh.gov.my/fhir/StructureDefinition/family-group']
      },
      identifier: [{
        system: 'http://medimate.my/family-circle',
        value: familyData.id
      }],
      active: true,
      type: 'person',
      actual: true,
      code: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
          code: 'FAMMEMB',
          display: 'Family Member'
        }]
      },
      name: familyData.name,
      quantity: familyData.members?.length || 0,
      member: familyData.members?.map((member: any) => ({
        entity: {
          reference: `Patient/${member.userId}`,
          display: member.displayName
        },
        period: {
          start: member.joinedAt
        },
        inactive: member.status !== 'active'
      }))
    };

    // Add Malaysian cultural characteristics
    if (familyData.culturalProfile) {
      group.characteristic = [
        {
          code: {
            coding: [{
              system: 'http://moh.gov.my/fhir/CodeSystem/family-structure',
              code: familyData.culturalProfile.familyStructure,
              display: this.getFamilyStructureDisplay(familyData.culturalProfile.familyStructure)
            }]
          },
          valueBoolean: true
        }
      ];
    }

    return group;
  }

  /**
   * Create FHIR RelatedPerson resources for family members
   */
  private async createRelatedPersons(familyData: any): Promise<RelatedPerson[]> {
    const relatedPersons: RelatedPerson[] = [];

    for (const member of familyData.members || []) {
      const relatedPerson: RelatedPerson = {
        resourceType: 'RelatedPerson',
        id: uuidv4(),
        meta: {
          profile: ['http://moh.gov.my/fhir/StructureDefinition/related-person']
        },
        identifier: [{
          system: 'http://medimate.my/family-member',
          value: member.id
        }],
        active: member.status === 'active',
        patient: {
          reference: `Patient/${familyData.primaryPatientId}`,
          display: familyData.primaryPatientName
        },
        relationship: [this.mapRelationshipCode(member.relationship)],
        name: [{
          use: 'official',
          text: member.displayName,
          family: member.lastName,
          given: [member.firstName]
        }],
        telecom: member.contactInfo?.map((contact: any) => ({
          system: contact.type,
          value: contact.value,
          use: contact.use || 'home'
        })),
        gender: member.gender,
        birthDate: member.birthDate,
        communication: member.languages?.map((lang: string) => ({
          language: {
            coding: [{
              system: 'urn:ietf:bcp:47',
              code: lang,
              display: this.getLanguageDisplay(lang)
            }]
          },
          preferred: lang === member.primaryLanguage
        }))
      };

      relatedPersons.push(relatedPerson);
    }

    return relatedPersons;
  }

  /**
   * Create FHIR FamilyMemberHistory resources
   */
  private async createFamilyMemberHistories(familyData: any): Promise<FamilyMemberHistory[]> {
    const histories: FamilyMemberHistory[] = [];

    for (const member of familyData.members || []) {
      if (!member.healthHistory) continue;

      const history: FamilyMemberHistory = {
        resourceType: 'FamilyMemberHistory',
        id: uuidv4(),
        meta: {
          profile: ['http://moh.gov.my/fhir/StructureDefinition/family-member-history']
        },
        identifier: [{
          system: 'http://medimate.my/family-history',
          value: `${familyData.id}-${member.id}`
        }],
        status: 'completed',
        patient: {
          reference: `Patient/${familyData.primaryPatientId}`,
          display: familyData.primaryPatientName
        },
        date: new Date().toISOString(),
        relationship: this.mapRelationshipCode(member.relationship),
        name: member.displayName,
        sex: {
          coding: [{
            system: 'http://hl7.org/fhir/administrative-gender',
            code: member.gender,
            display: member.gender
          }]
        },
        condition: member.healthHistory?.conditions?.map((condition: any) => ({
          code: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: condition.snomedCode,
              display: condition.name
            }],
            text: condition.description
          },
          onsetAge: condition.onsetAge ? {
            value: condition.onsetAge,
            unit: 'years',
            system: 'http://unitsofmeasure.org',
            code: 'a'
          } : undefined,
          note: condition.notes ? [{
            text: condition.notes
          }] : undefined
        }))
      };

      histories.push(history);
    }

    return histories;
  }

  /**
   * Create FHIR Consent resources for privacy management
   */
  private async createConsentResources(familyData: any): Promise<Consent[]> {
    const consents: Consent[] = [];

    for (const member of familyData.members || []) {
      const privacySettings = await this.privacy.getPrivacySettings(
        member.userId,
        familyData.id
      );

      if (!privacySettings) continue;

      const consent: Consent = {
        resourceType: 'Consent',
        id: uuidv4(),
        meta: {
          profile: ['http://moh.gov.my/fhir/StructureDefinition/pdpa-consent']
        },
        identifier: [{
          system: 'http://medimate.my/consent',
          value: privacySettings.pdpaConsent.consentId
        }],
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
          reference: `Patient/${member.userId}`,
          display: member.displayName
        },
        dateTime: privacySettings.pdpaConsent.consentDate.toISOString(),
        organization: [{
          reference: 'Organization/medimate',
          display: 'MediMate Malaysia'
        }],
        sourceAttachment: {
          title: 'PDPA Consent Form',
          creation: privacySettings.pdpaConsent.consentDate.toISOString()
        },
        policy: [{
          authority: 'http://www.kkmm.gov.my',
          uri: 'http://www.kkmm.gov.my/pdpa'
        }],
        provision: {
          type: 'permit',
          period: {
            start: privacySettings.pdpaConsent.consentDate.toISOString(),
            end: new Date(
              Date.now() + (privacySettings.pdpaConsent.dataRetentionPeriod * 24 * 60 * 60 * 1000)
            ).toISOString()
          },
          purpose: privacySettings.pdpaConsent.purposes
            ?.filter(p => p.consented)
            .map(purpose => ({
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
                code: 'TREAT',
                display: purpose.purpose
              }]
            })),
          dataPeriod: {
            start: privacySettings.pdpaConsent.consentDate.toISOString()
          }
        }
      };

      consents.push(consent);
    }

    return consents;
  }

  /**
   * Apply Malaysian cultural adaptations to FHIR bundle
   */
  private async applyCulturalAdaptations(bundle: Bundle, familyData: any): Promise<void> {
    // Add cultural extensions to bundle
    if (!bundle.meta) bundle.meta = {};
    if (!bundle.meta.extension) bundle.meta.extension = [];

    // Add Malaysian cultural context extension
    bundle.meta.extension.push({
      url: 'http://moh.gov.my/fhir/Extension/cultural-context',
      valueCodeableConcept: {
        coding: [{
          system: 'http://moh.gov.my/fhir/CodeSystem/cultural-context',
          code: familyData.culturalProfile?.primaryCulture || 'malaysian',
          display: this.getCulturalDisplay(familyData.culturalProfile?.primaryCulture)
        }]
      }
    });

    // Add language preference extension
    bundle.meta.extension.push({
      url: 'http://moh.gov.my/fhir/Extension/language-preference',
      valueCode: familyData.culturalProfile?.primaryLanguage || 'ms'
    });

    // Add religious considerations extension if applicable
    if (familyData.culturalProfile?.religion) {
      bundle.meta.extension.push({
        url: 'http://moh.gov.my/fhir/Extension/religious-considerations',
        valueCodeableConcept: {
          coding: [{
            system: 'http://moh.gov.my/fhir/CodeSystem/religion',
            code: familyData.culturalProfile.religion,
            display: this.getReligionDisplay(familyData.culturalProfile.religion)
          }]
        }
      });
    }

    // Add family structure extension
    if (familyData.culturalProfile?.familyStructure) {
      bundle.meta.extension.push({
        url: 'http://moh.gov.my/fhir/Extension/family-structure',
        valueCodeableConcept: {
          coding: [{
            system: 'http://moh.gov.my/fhir/CodeSystem/family-structure',
            code: familyData.culturalProfile.familyStructure,
            display: this.getFamilyStructureDisplay(familyData.culturalProfile.familyStructure)
          }]
        }
      });
    }
  }

  /**
   * Validate FHIR bundle against Malaysian healthcare profiles
   */
  private async validateFHIRBundle(bundle: Bundle): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check bundle structure
    if (!bundle.resourceType || bundle.resourceType !== 'Bundle') {
      result.valid = false;
      result.errors?.push('Invalid bundle resource type');
    }

    if (!bundle.type) {
      result.valid = false;
      result.errors?.push('Bundle type is required');
    }

    if (!bundle.entry || bundle.entry.length === 0) {
      result.warnings?.push('Bundle contains no entries');
    }

    // Validate each entry
    bundle.entry?.forEach((entry, index) => {
      if (!entry.resource) {
        result.errors?.push(`Entry ${index} has no resource`);
        result.valid = false;
      } else {
        // Validate resource type
        const validResourceTypes = [
          'Group', 'RelatedPerson', 'FamilyMemberHistory', 'Consent'
        ];
        if (!validResourceTypes.includes(entry.resource.resourceType)) {
          result.warnings?.push(
            `Entry ${index} has unexpected resource type: ${entry.resource.resourceType}`
          );
        }
      }
    });

    // Validate Malaysian profile compliance if specified
    if (bundle.meta?.profile?.includes('http://moh.gov.my/fhir/')) {
      const profileValidation = await this.validateMalaysianProfile(bundle);
      if (!profileValidation.valid) {
        result.valid = false;
        result.errors?.push(...(profileValidation.errors || []));
      }
    }

    return result;
  }

  /**
   * Validate Malaysian healthcare profile compliance
   */
  private async validateMalaysianProfile(bundle: Bundle): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check for required Malaysian extensions
    const requiredExtensions = [
      'http://moh.gov.my/fhir/Extension/cultural-context',
      'http://moh.gov.my/fhir/Extension/language-preference'
    ];

    const bundleExtensions = bundle.meta?.extension?.map(e => e.url) || [];
    requiredExtensions.forEach(ext => {
      if (!bundleExtensions.includes(ext)) {
        result.errors?.push(`Missing required Malaysian extension: ${ext}`);
        result.valid = false;
      }
    });

    return result;
  }

  /**
   * Send FHIR bundle to healthcare provider
   */
  private async sendBundleToProvider(
    bundle: Bundle,
    endpoint: string,
    providerId: string
  ): Promise<any> {
    try {
      const headers = {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
        'X-Provider-ID': providerId,
        'X-Request-ID': uuidv4()
      };

      // Add authentication headers based on provider
      if (providerId === 'MOH') {
        headers['Authorization'] = `Bearer ${process.env.MOH_API_TOKEN}`;
      } else {
        headers['Authorization'] = `Bearer ${process.env[`${providerId}_API_TOKEN`]}`;
      }

      const response = await fetch(`${endpoint}/Bundle`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bundle)
      });

      if (!response.ok) {
        throw new Error(`Provider returned ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to send bundle to provider ${providerId}`, error);
      throw error;
    }
  }

  /**
   * Process provider sync response
   */
  private async processSyncResponse(
    response: any,
    providerId: string
  ): Promise<ProviderSyncResult> {
    const result: ProviderSyncResult = {
      success: false,
      providerId,
      resourcesSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    if (response.resourceType === 'Bundle' && response.type === 'transaction-response') {
      result.success = true;
      result.resourcesSynced = response.entry?.length || 0;

      // Check for any errors in the response
      response.entry?.forEach((entry: any, index: number) => {
        if (entry.response?.status?.startsWith('4') || entry.response?.status?.startsWith('5')) {
          result.errors?.push(
            `Entry ${index}: ${entry.response.status} - ${entry.response.outcome?.text}`
          );
        }
      });
    } else if (response.resourceType === 'OperationOutcome') {
      // Handle operation outcome errors
      response.issue?.forEach((issue: any) => {
        result.errors?.push(`${issue.severity}: ${issue.diagnostics}`);
      });
    }

    return result;
  }

  /**
   * Get family data from database
   */
  private async getFamilyData(familyId: string): Promise<any> {
    const familyData = await this.db.query(
      `SELECT fc.*,
              GROUP_CONCAT(fm.user_id) as member_ids,
              GROUP_CONCAT(fm.role) as member_roles
       FROM family_circles fc
       LEFT JOIN family_members fm ON fc.id = fm.family_id
       WHERE fc.id = ?
       GROUP BY fc.id`,
      [familyId]
    );

    if (!familyData || familyData.length === 0) {
      throw new Error(`Family ${familyId} not found`);
    }

    // Get detailed member information
    const family = familyData[0];
    if (family.member_ids) {
      const memberIds = family.member_ids.split(',');
      const members = await this.db.query(
        `SELECT u.*, fm.role, fm.relationship, fm.cultural_role
         FROM users u
         JOIN family_members fm ON u.id = fm.user_id
         WHERE fm.family_id = ? AND fm.user_id IN (?)`,
        [familyId, memberIds]
      );
      family.members = members;
    }

    // Get cultural profile
    const culturalProfile = await this.cultural.getFamilyProfile(familyId);
    family.culturalProfile = culturalProfile;

    return family;
  }

  /**
   * Get provider endpoint
   */
  private getProviderEndpoint(providerId: string): string | undefined {
    if (providerId === 'MOH') {
      return this.MOH_ENDPOINT;
    }
    return this.PRIVATE_PROVIDERS.get(providerId);
  }

  /**
   * Validate provider endpoint connectivity
   */
  private async validateProviderEndpoint(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/metadata`, {
        method: 'GET',
        headers: {
          'Accept': 'application/fhir+json'
        }
      });
      return response.ok;
    } catch (error) {
      this.logger.error(`Failed to validate endpoint ${endpoint}`, error);
      return false;
    }
  }

  /**
   * Map relationship codes to FHIR CodeableConcept
   */
  private mapRelationshipCode(relationship: string): CodeableConcept {
    const relationshipMap: Record<string, { system: string; code: string; display: string }> = {
      'parent': {
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: 'PRN',
        display: 'Parent'
      },
      'spouse': {
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: 'SPS',
        display: 'Spouse'
      },
      'child': {
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: 'CHILD',
        display: 'Child'
      },
      'sibling': {
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: 'SIB',
        display: 'Sibling'
      },
      'grandparent': {
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: 'GRPRN',
        display: 'Grandparent'
      },
      'grandchild': {
        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
        code: 'GRNDCHILD',
        display: 'Grandchild'
      }
    };

    const mapping = relationshipMap[relationship] || {
      system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
      code: 'FAMMEMB',
      display: 'Family Member'
    };

    return {
      coding: [mapping]
    };
  }

  /**
   * Get display text for languages
   */
  private getLanguageDisplay(code: string): string {
    const languageMap: Record<string, string> = {
      'ms': 'Bahasa Melayu',
      'en': 'English',
      'zh': '中文',
      'ta': 'தமிழ்'
    };
    return languageMap[code] || code;
  }

  /**
   * Get display text for cultural context
   */
  private getCulturalDisplay(culture?: string): string {
    const cultureMap: Record<string, string> = {
      'malay': 'Malay',
      'chinese': 'Chinese',
      'indian': 'Indian',
      'malaysian': 'Malaysian',
      'indigenous': 'Indigenous'
    };
    return culture ? (cultureMap[culture] || culture) : 'Malaysian';
  }

  /**
   * Get display text for religion
   */
  private getReligionDisplay(religion: string): string {
    const religionMap: Record<string, string> = {
      'islam': 'Islam',
      'buddhism': 'Buddhism',
      'christianity': 'Christianity',
      'hinduism': 'Hinduism',
      'other': 'Other'
    };
    return religionMap[religion] || religion;
  }

  /**
   * Get display text for family structure
   */
  private getFamilyStructureDisplay(structure: string): string {
    const structureMap: Record<string, string> = {
      'nuclear': 'Nuclear Family',
      'extended': 'Extended Family',
      'multi-generational': 'Multi-generational Family',
      'single-parent': 'Single Parent Family',
      'blended': 'Blended Family'
    };
    return structureMap[structure] || structure;
  }

  /**
   * Handle family update events
   */
  private async handleFamilyUpdate(data: any): Promise<void> {
    try {
      // Check if automatic sync is enabled
      const syncSettings = await this.db.query(
        'SELECT * FROM family_sync_settings WHERE family_id = ?',
        [data.familyId]
      );

      if (syncSettings && syncSettings[0]?.auto_sync_enabled) {
        // Sync with configured providers
        const providers = JSON.parse(syncSettings[0].providers || '[]');
        for (const providerId of providers) {
          await this.syncWithProvider(data.familyId, providerId);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle family update', error);
    }
  }

  /**
   * Handle consent change events
   */
  private async handleConsentChange(data: any): Promise<void> {
    try {
      // Update consent resources for affected providers
      this.emit('consent:update_required', {
        familyId: data.familyId,
        userId: data.userId,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to handle consent change', error);
    }
  }

  /**
   * Handle provider sync requests
   */
  private async handleProviderSync(data: any): Promise<void> {
    try {
      const result = await this.syncWithProvider(
        data.familyId,
        data.providerId,
        data.config
      );

      this.emit('provider:sync_result', {
        familyId: data.familyId,
        providerId: data.providerId,
        result
      });
    } catch (error) {
      this.logger.error('Failed to handle provider sync', error);
    }
  }
}

// Type definitions

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export default FamilyResourceService;