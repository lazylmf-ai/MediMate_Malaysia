/**
 * Cultural Emergency Handler
 *
 * Malaysian-specific emergency protocols that respect cultural norms and family structures:
 * - Family hierarchy consideration in emergency escalation
 * - Islamic cultural practices and prayer time awareness
 * - Multi-generational family coordination
 * - Cultural messaging and communication styles
 * - Malaysian emergency services integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyEvent, EmergencyMessage, EmergencyRecipient } from './EmergencyEngine';
import { FamilyMember, PatientFamilyCircle } from '../family/FamilyCoordinationService';
import { EmergencyContact } from '../notifications/NotificationPriorityService';
import type { SupportedLanguage } from '@/i18n/translations';

export interface MalaysianFamilyStructure {
  patientId: string;
  familyHierarchy: {
    elders: FamilyMember[]; // Grandparents, elderly relatives
    parents: FamilyMember[]; // Mother, father
    spouse: FamilyMember[]; // Husband, wife
    children: FamilyMember[]; // Sons, daughters
    siblings: FamilyMember[]; // Brothers, sisters
    caregivers: FamilyMember[]; // Professional or family caregivers
  };

  culturalPreferences: {
    respectElderDecisions: boolean;
    notifySpouseFirst: boolean;
    includeExtendedFamily: boolean;
    maintainPrivacy: boolean;
    useReligiousLanguage: boolean;
  };

  communicationProtocols: {
    primaryLanguage: SupportedLanguage;
    secondaryLanguages: SupportedLanguage[];
    formalCommunication: boolean;
    useHonorifics: boolean;
    respectGenderPreferences: boolean;
  };

  religiousPractices: {
    observesPrayerTimes: boolean;
    prayerSchedule?: {
      fajr: string; // "05:30"
      dhuhr: string; // "13:15"
      asr: string; // "16:30"
      maghrib: string; // "19:20"
      isha: string; // "20:30"
    };
    avoidInterruptionDuringPrayer: boolean;
    includeDuaInMessages: boolean;
  };

  emergencyContacts: MalaysianEmergencyContact[];
}

export interface MalaysianEmergencyContact extends EmergencyContact {
  // Malaysian-specific fields
  culturalRole: 'family_head' | 'eldest_son' | 'primary_daughter' | 'religious_leader' | 'family_doctor' | 'neighbor';
  preferredContactMethod: 'phone_call' | 'whatsapp' | 'sms' | 'in_person';
  malayName?: string; // Name in Bahasa Malaysia
  chineseName?: string; // Name in Chinese if applicable
  tamilName?: string; // Name in Tamil if applicable

  culturalConstraints: {
    gender: 'male' | 'female' | 'any';
    ageGroup: 'elderly' | 'adult' | 'young_adult';
    contactTimeRestrictions: string[]; // e.g., ["no_late_night", "avoid_prayer_times"]
    languagePreference: SupportedLanguage[];
  };

  emergencyRole: {
    canMakeDecisions: boolean;
    shouldNotifyFirst: boolean;
    canProvidePhysicalHelp: boolean;
    hasKeysToHome: boolean;
    knowsMedicalHistory: boolean;
  };
}

export interface CulturalEmergencyMessage {
  messageId: string;
  emergencyType: string;
  recipient: MalaysianEmergencyContact;

  culturalAdaptations: {
    useHonorifics: boolean;
    includeBlessings: boolean;
    formalTone: boolean;
    includeReligiousContext: boolean;
    respectGenderSensitivity: boolean;
  };

  languageVersions: Record<SupportedLanguage, {
    title: string;
    greeting: string;
    emergencyDescription: string;
    actionRequired: string;
    contactInformation: string;
    closing: string;
    dua?: string; // Islamic prayer/blessing
  }>;

  deliveryInstructions: {
    preferredMethod: 'voice' | 'sms' | 'whatsapp';
    timing: 'immediate' | 'respect_prayer_times' | 'daytime_only';
    repetition: boolean;
    followUpRequired: boolean;
  };
}

export interface MalaysianEmergencyProtocol {
  protocolId: string;
  emergencyType: 'missed_critical_medication' | 'health_incident' | 'no_response' | 'family_request';

  culturalEscalation: {
    level1: CulturalEscalationStep; // Immediate family
    level2: CulturalEscalationStep; // Extended family
    level3: CulturalEscalationStep; // Community/religious leaders
    level4: CulturalEscalationStep; // Healthcare providers
    level5: CulturalEscalationStep; // Emergency services
  };

  prayerTimeConsiderations: {
    delayDuringPrayer: boolean;
    useAlternateMethodsDuringPrayer: boolean;
    respectFridayPrayers: boolean;
    considerRamadanSchedule: boolean;
  };

  familyDecisionMaking: {
    requireElderConsent: boolean;
    notifyFamilyHeadFirst: boolean;
    allowFamilyOverride: boolean;
    respectPatientAutonomy: boolean;
  };
}

export interface CulturalEscalationStep {
  stepName: string;
  delayMinutes: number;
  recipients: MalaysianEmergencyContact[];

  communicationStyle: {
    urgencyLevel: 'polite_inquiry' | 'concerned_request' | 'urgent_appeal' | 'emergency_alert';
    includeContext: boolean;
    requestAction: string;
    providedInformation: string[];
  };

  culturalAdaptations: {
    addressByRole: boolean;
    useRespectfulLanguage: boolean;
    includePatientHonor: boolean;
    considerFamilyReputation: boolean;
  };

  stopConditions: string[]; // e.g., ["family_head_responds", "patient_found_safe"]
}

class CulturalEmergencyHandler {
  private static instance: CulturalEmergencyHandler;

  // Cultural data storage
  private familyStructures: Map<string, MalaysianFamilyStructure> = new Map();
  private emergencyProtocols: Map<string, MalaysianEmergencyProtocol> = new Map();
  private culturalMessages: Map<string, CulturalEmergencyMessage> = new Map();

  // Prayer time data
  private prayerTimes: Map<string, any> = new Map(); // Date -> prayer times

  private constructor() {
    this.initializeDefaultProtocols();
  }

  static getInstance(): CulturalEmergencyHandler {
    if (!CulturalEmergencyHandler.instance) {
      CulturalEmergencyHandler.instance = new CulturalEmergencyHandler();
    }
    return CulturalEmergencyHandler.instance;
  }

  /**
   * Initialize handler with patient family data
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Cultural Emergency Handler...');

      // Load family structures and protocols
      await this.loadFamilyStructures();
      await this.loadEmergencyProtocols();
      await this.loadPrayerTimeData();

      console.log('Cultural Emergency Handler initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('Failed to initialize Cultural Emergency Handler:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Adapt emergency event for Malaysian cultural context
   */
  async adaptEmergencyForCulture(
    emergencyEvent: EmergencyEvent,
    familyCircle: PatientFamilyCircle
  ): Promise<{
    culturalEscalation: MalaysianEmergencyProtocol;
    adaptedMessages: CulturalEmergencyMessage[];
    familyStructure: MalaysianFamilyStructure;
  }> {
    try {
      console.log(`Adapting emergency ${emergencyEvent.id} for Malaysian cultural context`);

      // Get or create family structure
      const familyStructure = await this.getOrCreateFamilyStructure(
        emergencyEvent.patientId,
        familyCircle
      );

      // Select appropriate emergency protocol
      const protocol = await this.selectEmergencyProtocol(
        emergencyEvent.triggerCondition.type,
        familyStructure
      );

      // Create culturally adapted messages
      const adaptedMessages = await this.createCulturalMessages(
        emergencyEvent,
        familyStructure,
        protocol
      );

      return {
        culturalEscalation: protocol,
        adaptedMessages,
        familyStructure
      };

    } catch (error) {
      console.error('Failed to adapt emergency for culture:', error);
      throw error;
    }
  }

  /**
   * Check if current time respects prayer times
   */
  async shouldRespectPrayerTime(
    patientId: string,
    currentTime: Date = new Date()
  ): Promise<{
    isPrayerTime: boolean;
    currentPrayer?: string;
    nextAllowedTime?: Date;
    alternativeMethods?: string[];
  }> {
    try {
      const familyStructure = this.familyStructures.get(patientId);

      if (!familyStructure?.religiousPractices.observesPrayerTimes) {
        return { isPrayerTime: false };
      }

      const prayerSchedule = familyStructure.religiousPractices.prayerSchedule;
      if (!prayerSchedule) {
        return { isPrayerTime: false };
      }

      const currentTimeStr = currentTime.toTimeString().substr(0, 5); // "HH:mm"
      const currentMinutes = this.timeToMinutes(currentTimeStr);

      // Check each prayer time (with ±15 minute buffer)
      const prayerBuffer = 15; // minutes

      for (const [prayerName, prayerTime] of Object.entries(prayerSchedule)) {
        const prayerMinutes = this.timeToMinutes(prayerTime);
        const startTime = prayerMinutes - prayerBuffer;
        const endTime = prayerMinutes + prayerBuffer;

        if (currentMinutes >= startTime && currentMinutes <= endTime) {
          const nextAllowedTime = new Date(currentTime);
          nextAllowedTime.setMinutes(nextAllowedTime.getMinutes() + (endTime - currentMinutes));

          return {
            isPrayerTime: true,
            currentPrayer: prayerName,
            nextAllowedTime,
            alternativeMethods: ['sms', 'whatsapp'] // Silent methods during prayer
          };
        }
      }

      return { isPrayerTime: false };

    } catch (error) {
      console.error('Failed to check prayer time:', error);
      return { isPrayerTime: false };
    }
  }

  /**
   * Get culturally appropriate escalation order
   */
  async getCulturalEscalationOrder(
    familyStructure: MalaysianFamilyStructure,
    emergencyType: string
  ): Promise<MalaysianEmergencyContact[]> {
    try {
      console.log('Determining cultural escalation order for', emergencyType);

      const escalationOrder: MalaysianEmergencyContact[] = [];
      const { familyHierarchy, culturalPreferences } = familyStructure;

      // Level 1: Immediate family based on cultural hierarchy
      if (culturalPreferences.notifySpouseFirst && familyHierarchy.spouse.length > 0) {
        // Add spouse first if they exist
        escalationOrder.push(...this.convertToMalaysianContacts(familyHierarchy.spouse));
      }

      if (culturalPreferences.respectElderDecisions && familyHierarchy.elders.length > 0) {
        // Add elders who can make decisions
        escalationOrder.push(...this.convertToMalaysianContacts(familyHierarchy.elders));
      }

      // Add parents
      escalationOrder.push(...this.convertToMalaysianContacts(familyHierarchy.parents));

      // Add primary caregivers
      escalationOrder.push(...this.convertToMalaysianContacts(familyHierarchy.caregivers));

      // Level 2: Extended family if enabled
      if (culturalPreferences.includeExtendedFamily) {
        escalationOrder.push(...this.convertToMalaysianContacts(familyHierarchy.children));
        escalationOrder.push(...this.convertToMalaysianContacts(familyHierarchy.siblings));
      }

      // Level 3: Emergency contacts with special roles
      escalationOrder.push(...familyStructure.emergencyContacts.filter(
        contact => contact.culturalRole === 'family_doctor' ||
                  contact.culturalRole === 'religious_leader'
      ));

      // Sort by priority and cultural role importance
      escalationOrder.sort((a, b) => {
        // Cultural role priority
        const roleWeight = this.getCulturalRoleWeight(a.culturalRole) -
                          this.getCulturalRoleWeight(b.culturalRole);
        if (roleWeight !== 0) return roleWeight;

        // Emergency role priority
        const emergencyWeight = (b.emergencyRole.shouldNotifyFirst ? 10 : 0) -
                               (a.emergencyRole.shouldNotifyFirst ? 10 : 0);
        if (emergencyWeight !== 0) return emergencyWeight;

        // General priority
        return b.priority - a.priority;
      });

      return escalationOrder;

    } catch (error) {
      console.error('Failed to get cultural escalation order:', error);
      return [];
    }
  }

  /**
   * Create culturally appropriate emergency message
   */
  async createCulturalMessage(
    recipient: MalaysianEmergencyContact,
    emergencyEvent: EmergencyEvent,
    urgencyLevel: string
  ): Promise<CulturalEmergencyMessage> {
    try {
      const messageId = `cultural_msg_${Date.now()}_${recipient.id}`;

      // Determine cultural adaptations
      const culturalAdaptations = {
        useHonorifics: recipient.culturalConstraints.ageGroup === 'elderly' ||
                      recipient.culturalRole === 'family_head',
        includeBlessings: recipient.language === 'ms' &&
                         emergencyEvent.familyCoordination.familyCircle?.coordinationSettings.respectCulturalConstraints,
        formalTone: recipient.culturalConstraints.ageGroup === 'elderly' ||
                   recipient.culturalRole === 'religious_leader',
        includeReligiousContext: recipient.language === 'ms' &&
                               urgencyLevel === 'emergency_alert',
        respectGenderSensitivity: recipient.culturalConstraints.gender !== 'any'
      };

      // Create language versions
      const languageVersions: Record<SupportedLanguage, any> = {};

      // Malay version
      languageVersions.ms = this.createMalayMessage(
        recipient,
        emergencyEvent,
        culturalAdaptations,
        urgencyLevel
      );

      // English version
      languageVersions.en = this.createEnglishMessage(
        recipient,
        emergencyEvent,
        culturalAdaptations,
        urgencyLevel
      );

      // Chinese version if needed
      if (recipient.culturalConstraints.languagePreference.includes('zh')) {
        languageVersions.zh = this.createChineseMessage(
          recipient,
          emergencyEvent,
          culturalAdaptations,
          urgencyLevel
        );
      }

      // Tamil version if needed
      if (recipient.culturalConstraints.languagePreference.includes('ta')) {
        languageVersions.ta = this.createTamilMessage(
          recipient,
          emergencyEvent,
          culturalAdaptations,
          urgencyLevel
        );
      }

      const message: CulturalEmergencyMessage = {
        messageId,
        emergencyType: emergencyEvent.triggerCondition.type,
        recipient,
        culturalAdaptations,
        languageVersions,
        deliveryInstructions: {
          preferredMethod: recipient.preferredContactMethod === 'phone_call' ? 'voice' : 'sms',
          timing: culturalAdaptations.includeReligiousContext ? 'respect_prayer_times' : 'immediate',
          repetition: urgencyLevel === 'emergency_alert',
          followUpRequired: recipient.emergencyRole.shouldNotifyFirst
        }
      };

      return message;

    } catch (error) {
      console.error('Failed to create cultural message:', error);
      throw error;
    }
  }

  /**
   * Check if emergency escalation should be delayed for cultural reasons
   */
  async shouldDelayEscalation(
    patientId: string,
    escalationLevel: number,
    currentTime: Date = new Date()
  ): Promise<{
    shouldDelay: boolean;
    reason?: string;
    suggestedDelay?: number; // minutes
    alternativeAction?: string;
  }> {
    try {
      // Check prayer times
      const prayerCheck = await this.shouldRespectPrayerTime(patientId, currentTime);
      if (prayerCheck.isPrayerTime) {
        return {
          shouldDelay: true,
          reason: `Current prayer time: ${prayerCheck.currentPrayer}`,
          suggestedDelay: 20, // Wait until after prayer
          alternativeAction: 'Use silent notification methods'
        };
      }

      // Check Friday prayers (12:00-14:00 on Fridays)
      if (currentTime.getDay() === 5) { // Friday
        const hour = currentTime.getHours();
        if (hour >= 12 && hour < 14) {
          return {
            shouldDelay: true,
            reason: 'Friday prayers time',
            suggestedDelay: (14 - hour) * 60 - currentTime.getMinutes(),
            alternativeAction: 'Send SMS instead of voice calls'
          };
        }
      }

      // Check late night hours (23:00-06:00)
      const hour = currentTime.getHours();
      if (hour >= 23 || hour < 6) {
        return {
          shouldDelay: true,
          reason: 'Late night - respect family sleep time',
          suggestedDelay: hour >= 23 ? (6 + 24 - hour) * 60 : (6 - hour) * 60,
          alternativeAction: 'Emergency contacts only'
        };
      }

      return { shouldDelay: false };

    } catch (error) {
      console.error('Failed to check escalation delay:', error);
      return { shouldDelay: false };
    }
  }

  /**
   * Private helper methods
   */

  private async getOrCreateFamilyStructure(
    patientId: string,
    familyCircle: PatientFamilyCircle
  ): Promise<MalaysianFamilyStructure> {
    let structure = this.familyStructures.get(patientId);

    if (!structure) {
      structure = this.createFamilyStructureFromCircle(patientId, familyCircle);
      this.familyStructures.set(patientId, structure);
      await this.saveFamilyStructures();
    }

    return structure;
  }

  private createFamilyStructureFromCircle(
    patientId: string,
    familyCircle: PatientFamilyCircle
  ): MalaysianFamilyStructure {
    // Group family members by relationship
    const familyHierarchy = {
      elders: familyCircle.familyMembers.filter(m =>
        ['parent', 'grandparent'].includes(m.relationship) && this.calculateAge(m) > 60
      ),
      parents: familyCircle.familyMembers.filter(m => m.relationship === 'parent'),
      spouse: familyCircle.familyMembers.filter(m => m.relationship === 'spouse'),
      children: familyCircle.familyMembers.filter(m => m.relationship === 'child'),
      siblings: familyCircle.familyMembers.filter(m => m.relationship === 'sibling'),
      caregivers: familyCircle.familyMembers.filter(m => m.relationship === 'caregiver')
    };

    return {
      patientId,
      familyHierarchy,
      culturalPreferences: {
        respectElderDecisions: true,
        notifySpouseFirst: true,
        includeExtendedFamily: true,
        maintainPrivacy: false,
        useReligiousLanguage: true
      },
      communicationProtocols: {
        primaryLanguage: 'ms',
        secondaryLanguages: ['en'],
        formalCommunication: true,
        useHonorifics: true,
        respectGenderPreferences: false
      },
      religiousPractices: {
        observesPrayerTimes: true,
        prayerSchedule: {
          fajr: "05:30",
          dhuhr: "13:15",
          asr: "16:30",
          maghrib: "19:20",
          isha: "20:30"
        },
        avoidInterruptionDuringPrayer: true,
        includeDuaInMessages: true
      },
      emergencyContacts: []
    };
  }

  private convertToMalaysianContacts(members: FamilyMember[]): MalaysianEmergencyContact[] {
    return members.map(member => ({
      id: member.id,
      name: member.name,
      relationship: member.relationship,
      phoneNumber: member.phoneNumber,
      email: member.email,
      language: member.language,
      culturalRole: this.determineCulturalRole(member),
      preferredContactMethod: 'phone_call',
      culturalConstraints: {
        gender: 'any',
        ageGroup: this.calculateAge(member) > 60 ? 'elderly' : 'adult',
        contactTimeRestrictions: ['avoid_prayer_times'],
        languagePreference: [member.language]
      },
      emergencyRole: {
        canMakeDecisions: member.permissions.isPrimaryCaregiver,
        shouldNotifyFirst: member.priority > 7,
        canProvidePhysicalHelp: true,
        hasKeysToHome: member.relationship === 'spouse' || member.relationship === 'child',
        knowsMedicalHistory: member.permissions.canViewMedications
      },
      culturalPreferences: member.culturalPreferences,
      priority: member.priority,
      enabled: member.isEnabled
    }));
  }

  private determineCulturalRole(member: FamilyMember): MalaysianEmergencyContact['culturalRole'] {
    if (member.relationship === 'spouse') return 'family_head';
    if (member.relationship === 'child' && member.priority > 8) return 'eldest_son';
    if (member.relationship === 'child') return 'primary_daughter';
    if (member.relationship === 'caregiver') return 'family_doctor';
    return 'family_head';
  }

  private calculateAge(member: FamilyMember): number {
    // Mock age calculation - in real implementation, would use birth date
    return member.relationship === 'parent' ? 65 : 35;
  }

  private getCulturalRoleWeight(role: MalaysianEmergencyContact['culturalRole']): number {
    const weights = {
      'family_head': 1,
      'eldest_son': 2,
      'primary_daughter': 3,
      'religious_leader': 4,
      'family_doctor': 5,
      'neighbor': 6
    };
    return weights[role] || 10;
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private createMalayMessage(
    recipient: MalaysianEmergencyContact,
    emergencyEvent: EmergencyEvent,
    adaptations: any,
    urgencyLevel: string
  ): any {
    const patientName = emergencyEvent.patientId; // In real implementation, get from patient data
    const medicationName = emergencyEvent.eventData.medicationName || 'ubat';

    const honorific = adaptations.useHonorifics ?
      (recipient.culturalConstraints.ageGroup === 'elderly' ? 'Dato\'/Datin ' : 'Encik/Puan ') : '';

    return {
      title: 'KECEMASAN: Bantuan Diperlukan',
      greeting: `Assalamualaikum ${honorific}${recipient.malayName || recipient.name},`,
      emergencyDescription: `Kami perlu memaklumkan bahawa ${patientName} mungkin memerlukan bantuan kecemasan. Beliau tidak mengambil ubat penting (${medicationName}) pada masa yang dijadualkan.`,
      actionRequired: 'Sila hubungi beliau segera atau pergi ke rumahnya untuk memastikan keselamatannya.',
      contactInformation: `Nombor telefon: ${recipient.phoneNumber}`,
      closing: 'Terima kasih atas bantuan segera anda.',
      dua: adaptations.includeBlessings ? 'Semoga Allah melindungi kita semua. Amin.' : undefined
    };
  }

  private createEnglishMessage(
    recipient: MalaysianEmergencyContact,
    emergencyEvent: EmergencyEvent,
    adaptations: any,
    urgencyLevel: string
  ): any {
    const patientName = emergencyEvent.patientId;
    const medicationName = emergencyEvent.eventData.medicationName || 'medication';

    const greeting = adaptations.formalTone ?
      `Dear ${adaptations.useHonorifics ? 'Mr./Mrs. ' : ''}${recipient.name},` :
      `Hello ${recipient.name},`;

    return {
      title: 'EMERGENCY: Help Needed',
      greeting,
      emergencyDescription: `We need to inform you that ${patientName} may require emergency assistance. They have missed their important medication (${medicationName}) at the scheduled time.`,
      actionRequired: 'Please contact them immediately or go to their home to ensure their safety.',
      contactInformation: `Phone: ${recipient.phoneNumber}`,
      closing: 'Thank you for your immediate assistance.'
    };
  }

  private createChineseMessage(
    recipient: MalaysianEmergencyContact,
    emergencyEvent: EmergencyEvent,
    adaptations: any,
    urgencyLevel: string
  ): any {
    const patientName = emergencyEvent.patientId;
    const medicationName = emergencyEvent.eventData.medicationName || '药物';

    return {
      title: '紧急情况：需要帮助',
      greeting: `${recipient.chineseName || recipient.name}，您好！`,
      emergencyDescription: `我们需要通知您，${patientName}可能需要紧急援助。他们错过了重要药物（${medicationName}）的预定服用时间。`,
      actionRequired: '请立即联系他们或前往他们家中确保安全。',
      contactInformation: `电话：${recipient.phoneNumber}`,
      closing: '感谢您的及时帮助。'
    };
  }

  private createTamilMessage(
    recipient: MalaysianEmergencyContact,
    emergencyEvent: EmergencyEvent,
    adaptations: any,
    urgencyLevel: string
  ): any {
    const patientName = emergencyEvent.patientId;
    const medicationName = emergencyEvent.eventData.medicationName || 'மருந்து';

    return {
      title: 'அவசரநிலை: உதவி தேவை',
      greeting: `${recipient.tamilName || recipient.name} அவர்களுக்கு வணக்கம்,`,
      emergencyDescription: `${patientName} அவர்களுக்கு அவசர உதவி தேவைப்படலாம் என்பதை தெரிவித்துக் கொள்கிறோம். அவர்கள் முக்கியமான மருந்தை (${medicationName}) நிர்ணயிக்கப்பட்ட நேரத்தில் எடுக்கவில்லை.`,
      actionRequired: 'உடனடியாக அவர்களை தொடர்பு கொள்ளுங்கள் அல்லது அவர்களின் பாதுகாப்பை உறுதி செய்ய அவர்களின் வீட்டிற்கு செல்லுங்கள்.',
      contactInformation: `தொலைபேசி: ${recipient.phoneNumber}`,
      closing: 'உங்களின் உடனடி உதவிக்கு நன்றி.'
    };
  }

  private async selectEmergencyProtocol(
    emergencyType: string,
    familyStructure: MalaysianFamilyStructure
  ): Promise<MalaysianEmergencyProtocol> {
    // Return default protocol for now
    return this.emergencyProtocols.get('default') || this.createDefaultProtocol();
  }

  private async createCulturalMessages(
    emergencyEvent: EmergencyEvent,
    familyStructure: MalaysianFamilyStructure,
    protocol: MalaysianEmergencyProtocol
  ): Promise<CulturalEmergencyMessage[]> {
    const messages: CulturalEmergencyMessage[] = [];

    // Get escalation order
    const escalationOrder = await this.getCulturalEscalationOrder(
      familyStructure,
      emergencyEvent.triggerCondition.type
    );

    // Create messages for each recipient
    for (const recipient of escalationOrder) {
      const message = await this.createCulturalMessage(
        recipient,
        emergencyEvent,
        'urgent_appeal'
      );
      messages.push(message);
    }

    return messages;
  }

  private initializeDefaultProtocols(): void {
    const defaultProtocol = this.createDefaultProtocol();
    this.emergencyProtocols.set('default', defaultProtocol);
  }

  private createDefaultProtocol(): MalaysianEmergencyProtocol {
    return {
      protocolId: 'default_malaysian',
      emergencyType: 'missed_critical_medication',
      culturalEscalation: {
        level1: {
          stepName: 'Immediate Family',
          delayMinutes: 0,
          recipients: [],
          communicationStyle: {
            urgencyLevel: 'concerned_request',
            includeContext: true,
            requestAction: 'Please check on patient',
            providedInformation: ['medication_missed', 'time_missed']
          },
          culturalAdaptations: {
            addressByRole: true,
            useRespectfulLanguage: true,
            includePatientHonor: true,
            considerFamilyReputation: false
          },
          stopConditions: ['patient_responds', 'family_confirms_safe']
        },
        level2: {
          stepName: 'Extended Family',
          delayMinutes: 10,
          recipients: [],
          communicationStyle: {
            urgencyLevel: 'urgent_appeal',
            includeContext: true,
            requestAction: 'Please assist in locating patient',
            providedInformation: ['medication_missed', 'family_notified', 'time_elapsed']
          },
          culturalAdaptations: {
            addressByRole: true,
            useRespectfulLanguage: true,
            includePatientHonor: true,
            considerFamilyReputation: true
          },
          stopConditions: ['patient_found', 'family_head_responds']
        },
        level3: {
          stepName: 'Community Leaders',
          delayMinutes: 20,
          recipients: [],
          communicationStyle: {
            urgencyLevel: 'emergency_alert',
            includeContext: false,
            requestAction: 'Please provide assistance',
            providedInformation: ['emergency_situation', 'family_consent']
          },
          culturalAdaptations: {
            addressByRole: true,
            useRespectfulLanguage: true,
            includePatientHonor: true,
            considerFamilyReputation: true
          },
          stopConditions: ['situation_resolved']
        },
        level4: {
          stepName: 'Healthcare Providers',
          delayMinutes: 30,
          recipients: [],
          communicationStyle: {
            urgencyLevel: 'emergency_alert',
            includeContext: true,
            requestAction: 'Medical assessment needed',
            providedInformation: ['full_medical_context', 'timeline', 'family_actions']
          },
          culturalAdaptations: {
            addressByRole: false,
            useRespectfulLanguage: true,
            includePatientHonor: false,
            considerFamilyReputation: false
          },
          stopConditions: ['medical_intervention']
        },
        level5: {
          stepName: 'Emergency Services',
          delayMinutes: 45,
          recipients: [],
          communicationStyle: {
            urgencyLevel: 'emergency_alert',
            includeContext: true,
            requestAction: 'Emergency response required',
            providedInformation: ['location', 'medical_condition', 'urgency_level']
          },
          culturalAdaptations: {
            addressByRole: false,
            useRespectfulLanguage: false,
            includePatientHonor: false,
            considerFamilyReputation: false
          },
          stopConditions: ['emergency_services_dispatched']
        }
      },
      prayerTimeConsiderations: {
        delayDuringPrayer: true,
        useAlternateMethodsDuringPrayer: true,
        respectFridayPrayers: true,
        considerRamadanSchedule: true
      },
      familyDecisionMaking: {
        requireElderConsent: false,
        notifyFamilyHeadFirst: true,
        allowFamilyOverride: true,
        respectPatientAutonomy: true
      }
    };
  }

  // Storage methods
  private async loadFamilyStructures(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('malaysian_family_structures');
      if (stored) {
        const data = JSON.parse(stored);
        this.familyStructures = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load family structures:', error);
    }
  }

  private async saveFamilyStructures(): Promise<void> {
    try {
      const data = Object.fromEntries(this.familyStructures.entries());
      await AsyncStorage.setItem('malaysian_family_structures', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save family structures:', error);
    }
  }

  private async loadEmergencyProtocols(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('malaysian_emergency_protocols');
      if (stored) {
        const data = JSON.parse(stored);
        this.emergencyProtocols = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load emergency protocols:', error);
    }
  }

  private async loadPrayerTimeData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('prayer_times_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.prayerTimes = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load prayer time data:', error);
    }
  }

  // Public methods
  async updateFamilyStructure(
    patientId: string,
    structure: Partial<MalaysianFamilyStructure>
  ): Promise<void> {
    const existing = this.familyStructures.get(patientId);
    if (existing) {
      this.familyStructures.set(patientId, { ...existing, ...structure });
      await this.saveFamilyStructures();
    }
  }

  getFamilyStructure(patientId: string): MalaysianFamilyStructure | undefined {
    return this.familyStructures.get(patientId);
  }
}

export default CulturalEmergencyHandler;