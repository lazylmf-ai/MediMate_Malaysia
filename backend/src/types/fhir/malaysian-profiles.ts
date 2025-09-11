import { Patient, Practitioner, Organization, Encounter } from 'fhir/r4';

// Malaysian Healthcare Identifier Types
export interface MalaysianIdentifier {
  type: 'myKad' | 'passport' | 'foreignWorker' | 'refugeeCard' | 'birth_cert';
  value: string;
  system: string;
  assigner?: string;
}

// Malaysian Patient Profile - extends FHIR R4 Patient
export interface MalaysianPatient extends Patient {
  identifier: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
    type: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text?: string;
    };
    system: string;
    value: string;
    assigner?: {
      reference: string;
      display: string;
    };
  }>;
  
  // Malaysian specific extensions
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueBoolean?: boolean;
    valueCoding?: {
      system: string;
      code: string;
      display: string;
    };
  }>;
  
  // Malaysian address format
  address?: Array<{
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
    type?: 'postal' | 'physical' | 'both';
    text?: string;
    line?: string[];
    city?: string;
    district?: string; // Malaysian districts
    state?: string; // Malaysian states
    postalCode?: string;
    country?: string;
    period?: {
      start?: string;
      end?: string;
    };
  }>;
  
  // Malaysian contact preferences
  contact?: Array<{
    relationship?: Array<{
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    }>;
    name?: {
      use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
      family?: string;
      given?: string[];
      prefix?: string[];
      suffix?: string[];
    };
    telecom?: Array<{
      system: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
      value: string;
      use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
      rank?: number;
    }>;
    address?: {
      use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
      type?: 'postal' | 'physical' | 'both';
      text?: string;
      line?: string[];
      city?: string;
      district?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    gender?: 'male' | 'female' | 'other' | 'unknown';
    organization?: {
      reference: string;
      display: string;
    };
    period?: {
      start?: string;
      end?: string;
    };
  }>;
}

// Malaysian Practitioner Profile - extends FHIR R4 Practitioner
export interface MalaysianPractitioner extends Practitioner {
  identifier: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
    type: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text?: string;
    };
    system: string;
    value: string;
    assigner?: {
      reference: string;
      display: string;
    };
  }>;
  
  // Malaysian medical licenses and certifications
  qualification?: Array<{
    identifier?: Array<{
      use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
      type?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
      };
      system: string;
      value: string;
    }>;
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text?: string;
    };
    period?: {
      start?: string;
      end?: string;
    };
    issuer?: {
      reference: string;
      display: string;
    };
  }>;
  
  // Malaysian healthcare provider categories
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueBoolean?: boolean;
    valueCoding?: {
      system: string;
      code: string;
      display: string;
    };
  }>;
}

// Malaysian Organization Profile - extends FHIR R4 Organization
export interface MalaysianOrganization extends Organization {
  identifier: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
    type: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text?: string;
    };
    system: string;
    value: string;
    assigner?: {
      reference: string;
      display: string;
    };
  }>;
  
  // Malaysian healthcare facility types
  type?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  }>;
  
  // Malaysian facility accreditation
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueBoolean?: boolean;
    valueCoding?: {
      system: string;
      code: string;
      display: string;
    };
    valueReference?: {
      reference: string;
      display?: string;
    };
  }>;
}

// Malaysian Encounter Profile - extends FHIR R4 Encounter
export interface MalaysianEncounter extends Encounter {
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
    type?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    system: string;
    value: string;
    assigner?: {
      reference: string;
      display: string;
    };
  }>;
  
  // Malaysian encounter types and settings
  class: {
    system: string;
    code: string;
    display: string;
  };
  
  // Malaysian specific encounter extensions
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueBoolean?: boolean;
    valueCoding?: {
      system: string;
      code: string;
      display: string;
    };
    valueReference?: {
      reference: string;
      display?: string;
    };
  }>;
  
  // Malaysian billing and insurance information
  account?: Array<{
    reference: string;
    display?: string;
  }>;
}

// Malaysian Healthcare System Constants
export const MALAYSIAN_FHIR_SYSTEMS = {
  PATIENT_IDENTIFIERS: {
    MYKAD: 'https://fhir.moh.gov.my/identifier/mykad',
    PASSPORT: 'https://fhir.moh.gov.my/identifier/passport',
    FOREIGN_WORKER: 'https://fhir.moh.gov.my/identifier/foreign-worker',
    REFUGEE_CARD: 'https://fhir.moh.gov.my/identifier/refugee-card',
    BIRTH_CERTIFICATE: 'https://fhir.moh.gov.my/identifier/birth-certificate'
  },
  
  PRACTITIONER_IDENTIFIERS: {
    MMC: 'https://fhir.mmc.gov.my/identifier/mmc-number', // Malaysian Medical Council
    MDA: 'https://fhir.mda.gov.my/identifier/mda-number', // Malaysian Dental Association
    PSM: 'https://fhir.psm.gov.my/identifier/psm-number', // Pharmaceutical Society of Malaysia
    MNC: 'https://fhir.mnc.gov.my/identifier/mnc-number'  // Malaysian Nursing Council
  },
  
  ORGANIZATION_IDENTIFIERS: {
    MOH_FACILITY: 'https://fhir.moh.gov.my/identifier/facility-code',
    HOSPITAL_LICENSE: 'https://fhir.moh.gov.my/identifier/hospital-license',
    CLINIC_LICENSE: 'https://fhir.moh.gov.my/identifier/clinic-license'
  },
  
  ENCOUNTER_TYPES: {
    OUTPATIENT: 'https://fhir.moh.gov.my/CodeSystem/encounter-type',
    INPATIENT: 'https://fhir.moh.gov.my/CodeSystem/encounter-type',
    EMERGENCY: 'https://fhir.moh.gov.my/CodeSystem/encounter-type',
    TELEMEDICINE: 'https://fhir.moh.gov.my/CodeSystem/encounter-type'
  },
  
  EXTENSIONS: {
    RACE: 'https://fhir.moh.gov.my/StructureDefinition/patient-race',
    RELIGION: 'https://fhir.moh.gov.my/StructureDefinition/patient-religion',
    NATIONALITY: 'https://fhir.moh.gov.my/StructureDefinition/patient-nationality',
    BIRTH_PLACE: 'https://fhir.moh.gov.my/StructureDefinition/patient-birthPlace',
    MOTHER_MAIDEN_NAME: 'https://fhir.moh.gov.my/StructureDefinition/patient-motherMaidenName',
    FACILITY_TYPE: 'https://fhir.moh.gov.my/StructureDefinition/organization-facilityType',
    ACCREDITATION: 'https://fhir.moh.gov.my/StructureDefinition/organization-accreditation'
  }
} as const;

// Malaysian States and Federal Territories
export const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Malacca', 'Negeri Sembilan', 'Pahang',
  'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
  'Kuala Lumpur', 'Labuan', 'Putrajaya'
] as const;

// Malaysian Race Categories (based on official Malaysian classification)
export const MALAYSIAN_RACES = [
  'Malay', 'Chinese', 'Indian', 'Iban', 'Bidayuh', 'Kadazan', 'Bajau',
  'Murut', 'Other Bumiputera', 'Others'
] as const;

// Malaysian Religion Categories
export const MALAYSIAN_RELIGIONS = [
  'Islam', 'Buddhism', 'Christianity', 'Hinduism', 'Taoism', 'Confucianism',
  'Sikhism', 'Others', 'No Religion'
] as const;

// Malaysian Healthcare Facility Types
export const MALAYSIAN_FACILITY_TYPES = [
  'Government Hospital', 'Private Hospital', 'University Hospital',
  'Specialist Hospital', 'Polyclinic', 'Community Clinic', '1Malaysia Clinic',
  'Private Clinic', 'Dental Clinic', 'Traditional Medicine Center',
  'Rehabilitation Center', 'Dialysis Center', 'Ambulatory Surgery Center'
] as const;

// Malaysian Medical Specialties (based on MMC specialties)
export const MALAYSIAN_MEDICAL_SPECIALTIES = [
  'Family Medicine', 'Internal Medicine', 'Surgery', 'Obstetrics & Gynaecology',
  'Paediatrics', 'Psychiatry', 'Orthopaedics', 'Ophthalmology', 'Dermatology',
  'Radiology', 'Pathology', 'Anaesthesiology', 'Emergency Medicine',
  'Public Health', 'Occupational Health', 'Sports Medicine', 'Geriatric Medicine',
  'Cardiology', 'Neurology', 'Oncology', 'Nephrology', 'Endocrinology',
  'Gastroenterology', 'Respiratory Medicine', 'Rheumatology', 'Infectious Diseases',
  'Nuclear Medicine', 'Rehabilitation Medicine', 'Plastic Surgery',
  'Neurosurgery', 'Cardiothoracic Surgery', 'Paediatric Surgery',
  'Orthopaedic Surgery', 'Urological Surgery'
] as const;

// Type definitions for Malaysian-specific enums
export type MalaysianState = typeof MALAYSIAN_STATES[number];
export type MalaysianRace = typeof MALAYSIAN_RACES[number];
export type MalaysianReligion = typeof MALAYSIAN_RELIGIONS[number];
export type MalaysianFacilityType = typeof MALAYSIAN_FACILITY_TYPES[number];
export type MalaysianMedicalSpecialty = typeof MALAYSIAN_MEDICAL_SPECIALTIES[number];