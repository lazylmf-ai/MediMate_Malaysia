import { Bundle, OperationOutcome } from 'fhir/r4';

// FHIR Operation Types
export interface FHIRSearchParameters {
  [key: string]: string | string[] | number | boolean | undefined;
  _count?: number;
  _offset?: number;
  _sort?: string;
  _include?: string | string[];
  _revinclude?: string | string[];
  _elements?: string | string[];
  _summary?: 'true' | 'false' | 'text' | 'data' | 'count';
  _format?: 'json' | 'xml' | 'turtle';
  _pretty?: boolean;
  _lastUpdated?: string;
  _tag?: string | string[];
  _profile?: string | string[];
  _security?: string | string[];
  _text?: string;
  _content?: string;
  _list?: string;
  _has?: string | string[];
  _type?: string | string[];
}

export interface FHIRBundleResponse extends Bundle {
  resourceType: 'Bundle';
  id?: string;
  meta?: {
    lastUpdated?: string;
    versionId?: string;
    profile?: string[];
    security?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    tag?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  total?: number;
  entry?: Array<{
    id?: string;
    fullUrl?: string;
    resource?: any;
    search?: {
      mode?: 'match' | 'include';
      score?: number;
    };
    request?: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      url: string;
      ifNoneMatch?: string;
      ifModifiedSince?: string;
      ifMatch?: string;
      ifNoneExist?: string;
    };
    response?: {
      status: string;
      location?: string;
      etag?: string;
      lastModified?: string;
      outcome?: OperationOutcome;
    };
  }>;
  link?: Array<{
    relation: 'self' | 'first' | 'previous' | 'next' | 'last';
    url: string;
  }>;
}

export interface FHIRValidationResult {
  isValid: boolean;
  operationOutcome?: OperationOutcome;
  errors: FHIRValidationError[];
  warnings: FHIRValidationWarning[];
}

export interface FHIRValidationError {
  severity: 'fatal' | 'error';
  code: string;
  details: string;
  location?: string;
  expression?: string[];
}

export interface FHIRValidationWarning {
  severity: 'warning' | 'information';
  code: string;
  details: string;
  location?: string;
  expression?: string[];
}

// Malaysian Healthcare Integration Types
export interface MOHIntegrationRequest {
  resourceType: string;
  resource: any;
  facilityCode: string;
  practitionerId: string;
  patientIdentifier?: {
    type: 'myKad' | 'passport' | 'foreignWorker';
    value: string;
  };
  timestamp: string;
  signature?: string;
}

export interface MOHIntegrationResponse {
  success: boolean;
  transactionId: string;
  timestamp: string;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface MySejahteraIntegrationData {
  patientId: string;
  nationalId: string;
  vaccinations?: Array<{
    vaccine: string;
    date: string;
    batch: string;
    manufacturer: string;
    site: string;
    provider: string;
  }>;
  healthStatus?: {
    covidStatus: 'negative' | 'positive' | 'recovered' | 'unknown';
    riskLevel: 'low' | 'medium' | 'high';
    lastUpdated: string;
  };
  travelHistory?: Array<{
    country: string;
    entryDate: string;
    exitDate?: string;
    purpose: string;
  }>;
}

export interface HospitalIntegrationConfig {
  facilityCode: string;
  facilityName: string;
  endpoint: string;
  authType: 'oauth2' | 'apiKey' | 'certificate';
  credentials: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    certificate?: string;
    privateKey?: string;
  };
  fhirVersion: 'R4' | 'STU3' | 'DSTU2';
  supportedResources: string[];
  messageFormat: 'FHIR' | 'HL7v2' | 'CUSTOM';
  enableRealTime: boolean;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

// HL7 v2.x Integration Types
export interface HL7v2Message {
  messageType: string;
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  timestamp: string;
  segments: HL7v2Segment[];
  raw?: string;
}

export interface HL7v2Segment {
  segmentType: string;
  fields: string[];
  raw: string;
}

export interface ADTMessage extends HL7v2Message {
  messageType: 'ADT^A01' | 'ADT^A02' | 'ADT^A03' | 'ADT^A04' | 'ADT^A08' | 'ADT^A11' | 'ADT^A12' | 'ADT^A13';
  patientInfo: {
    patientId: string;
    nationalId?: string;
    name: {
      family: string;
      given: string[];
    };
    birthDate: string;
    gender: 'M' | 'F' | 'O' | 'U';
    address?: {
      line: string[];
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  encounterInfo: {
    encounterId: string;
    encounterClass: 'I' | 'O' | 'A' | 'E'; // Inpatient, Outpatient, Ambulatory, Emergency
    admissionDate?: string;
    dischargeDate?: string;
    location: {
      facility: string;
      department?: string;
      room?: string;
      bed?: string;
    };
    attendingPhysician?: {
      id: string;
      name: string;
    };
  };
}

// Clinical Decision Support Types
export interface CDSSRequest {
  patientId: string;
  encounterId?: string;
  clinicalData: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    vitalSigns?: {
      temperature?: number;
      bloodPressure?: {
        systolic: number;
        diastolic: number;
      };
      heartRate?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
      weight?: number;
      height?: number;
    };
    labResults?: Array<{
      test: string;
      value: number | string;
      unit: string;
      referenceRange?: string;
      date: string;
    }>;
  };
  requestType: 'drug-interaction' | 'dosage-recommendation' | 'clinical-guidelines' | 'risk-assessment';
  malaysianContext: {
    patientRace?: string;
    patientReligion?: string;
    isHalalRequired?: boolean;
    languagePreference?: 'en' | 'ms' | 'zh' | 'ta';
  };
}

export interface CDSSResponse {
  recommendations: Array<{
    id: string;
    type: 'alert' | 'suggestion' | 'information';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    evidence?: {
      level: 'A' | 'B' | 'C' | 'D';
      source: string;
      url?: string;
    };
    actions?: Array<{
      type: 'medication-change' | 'lab-order' | 'referral' | 'follow-up';
      description: string;
      resource?: any;
    }>;
  }>;
  contraindications?: Array<{
    medication: string;
    reason: string;
    alternatives?: string[];
  }>;
  malaysianSpecificGuidance?: {
    halalStatus?: 'halal' | 'haram' | 'syubhah' | 'unknown';
    culturalConsiderations?: string[];
    languageSpecificInstructions?: {
      [key: string]: string; // language code -> instruction
    };
  };
}

// Pharmacy Integration Types
export interface MalaysianDrugInfo {
  registrationNumber: string;
  productName: string;
  genericName: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
  route: string;
  indication: string;
  contraindications: string[];
  sideEffects: string[];
  drugInteractions: string[];
  halalStatus: 'certified-halal' | 'halal-ingredients' | 'non-halal' | 'unknown';
  price?: {
    amount: number;
    currency: 'MYR';
    subsidized?: boolean;
  };
  availability: 'available' | 'limited' | 'discontinued';
  lastUpdated: string;
}

export interface PrescriptionValidationRequest {
  prescription: {
    patientId: string;
    practitionerId: string;
    medications: Array<{
      drugCode: string;
      drugName: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions: string;
    }>;
  };
  patientProfile: {
    allergies?: string[];
    currentMedications?: string[];
    conditions?: string[];
    age: number;
    weight?: number;
    kidneyFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
    liverFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
    isPregnant?: boolean;
    isBreastfeeding?: boolean;
    religiousRestrictions?: {
      requiresHalal: boolean;
      avoidPork: boolean;
      avoidAlcohol: boolean;
    };
  };
}

export interface PrescriptionValidationResponse {
  isValid: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'information';
    type: 'drug-interaction' | 'allergy' | 'dosage' | 'contraindication' | 'halal-status';
    medication: string;
    description: string;
    recommendation?: string;
  }>;
  halalCompliance: {
    allMedicationsHalal: boolean;
    nonHalalMedications: string[];
    halalAlternatives: Array<{
      originalDrug: string;
      alternative: string;
      reason: string;
    }>;
  };
  totalCost?: {
    amount: number;
    currency: 'MYR';
    subsidizedAmount?: number;
  };
}

// Laboratory Integration Types
export interface LabOrderRequest {
  patientId: string;
  practitionerId: string;
  encounterId?: string;
  tests: Array<{
    code: string;
    name: string;
    category: 'chemistry' | 'hematology' | 'microbiology' | 'immunology' | 'pathology';
    urgency: 'routine' | 'urgent' | 'stat';
    specimen?: {
      type: string;
      collection: {
        method: string;
        site?: string;
        instructions?: string;
      };
    };
  }>;
  clinicalInfo: {
    indication: string;
    diagnosis?: string[];
    symptoms?: string[];
  };
  malaysianContext: {
    facilityCode: string;
    preferredLanguage: 'en' | 'ms' | 'zh' | 'ta';
    halalRequirements?: {
      avoidPorkProducts: boolean;
      avoidAlcoholBasedReagents: boolean;
    };
  };
}

export interface LabResultResponse {
  orderId: string;
  patientId: string;
  results: Array<{
    testCode: string;
    testName: string;
    value: string | number;
    unit?: string;
    referenceRange?: string;
    status: 'preliminary' | 'final' | 'corrected' | 'cancelled';
    abnormalFlag?: 'high' | 'low' | 'critical-high' | 'critical-low';
    interpretation?: string;
    method?: string;
  }>;
  performingLab: {
    name: string;
    license: string;
    address: string;
    accreditation?: string[];
  };
  timestamps: {
    ordered: string;
    collected?: string;
    received?: string;
    resulted: string;
    reviewed?: string;
  };
  pathologist?: {
    name: string;
    license: string;
    signature?: string;
  };
}

// Export all types for easy importing
export type {
  Bundle,
  OperationOutcome
};