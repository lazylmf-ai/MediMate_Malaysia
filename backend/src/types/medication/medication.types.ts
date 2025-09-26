/**
 * Medication Management Types
 * Malaysian-specific medication definitions with cultural considerations
 */

export interface Medication {
  id: string;
  userId: string;
  name: string;
  genericName?: string;
  brandName?: string;
  dosage: MedicationDosage;
  schedule: MedicationSchedule;
  cultural: CulturalConsiderations;
  images: string[]; // Photo references from OCR
  ocrData?: OCRResult;
  status: MedicationStatus;
  category: MedicationCategory;
  prescriptionInfo?: PrescriptionInfo;
  malaysianInfo: MalaysianMedicationInfo;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationDosage {
  amount: number;
  unit: 'mg' | 'ml' | 'tablet' | 'capsule' | 'drop' | 'gram' | 'mcg';
  form: 'tablet' | 'liquid' | 'injection' | 'topical' | 'inhaler' | 'suppository';
  strength?: string;
  instructions: string;
}

export interface MedicationSchedule {
  frequency: 'daily' | 'twice_daily' | 'three_times' | 'four_times' | 'weekly' | 'monthly' | 'as_needed';
  times: string[]; // HH:mm format
  duration?: {
    start: string;
    end?: string;
    totalDays?: number;
  };
  culturalAdjustments: CulturalScheduleAdjustments;
}

export interface CulturalScheduleAdjustments {
  ramadanSchedule?: string[];
  prayerTimeBuffer: number; // minutes
  takeWithFood: boolean;
  avoidDuringFasting: boolean;
  prayerTimeConsiderations: string[];
}

export interface CulturalConsiderations {
  takeWithFood: boolean;
  avoidDuringFasting: boolean;
  prayerTimeConsiderations: string[];
  halalStatus: HalalStatus;
  languagePreference: 'ms' | 'en' | 'zh' | 'ta';
  traditionalMedicineInteractions?: string[];
}

export interface HalalStatus {
  isHalal: boolean;
  certificationBody?: string;
  certificateNumber?: string;
  concerns: string[];
  alternatives?: string[];
}

export interface MalaysianMedicationInfo {
  mohRegistration?: string;
  dcaRegistration?: string;
  localManufacturer?: string;
  availability: 'widely_available' | 'limited' | 'prescription_only' | 'unavailable';
  halalCertified: boolean;
  localAlternatives: string[];
  pricing?: {
    averagePrice: number;
    currency: 'MYR';
    lastUpdated: string;
  };
}

export interface OCRResult {
  confidence: number;
  extractedText: string;
  medicationName?: string;
  dosageInfo?: string;
  instructions?: string;
  language: 'ms' | 'en' | 'zh' | 'mixed';
  boundingBoxes: Array<{
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  culturalPatterns: {
    halalIndicators: string[];
    manufacturerInfo?: string;
    registrationNumbers: string[];
  };
}

export interface PrescriptionInfo {
  prescribedBy: string;
  prescriptionDate: string;
  prescriptionNumber?: string;
  refillsRemaining?: number;
  pharmacy?: string;
  isControlled: boolean;
}

export type MedicationStatus = 'active' | 'inactive' | 'completed' | 'discontinued' | 'paused';

export type MedicationCategory =
  | 'prescription'
  | 'otc'
  | 'supplement'
  | 'traditional'
  | 'herbal'
  | 'emergency';

export interface MedicationSearchParams {
  query: string;
  category?: MedicationCategory;
  halalOnly?: boolean;
  language?: 'ms' | 'en' | 'zh' | 'ta';
  type?: 'brand' | 'generic' | 'ingredient';
  availability?: string;
}

export interface MedicationDatabaseEntry {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  manufacturer: string;
  mohRegistration: string;
  dcaRegistration?: string;
  halalCertified: boolean;
  availability: string;
  dosageForms: string[];
  strengths: string[];
  interactions: string[];
  sideEffects: string[];
  contraindications: string[];
  instructions: {
    ms: string;
    en: string;
    zh?: string;
    ta?: string;
  };
  pricing?: {
    averagePrice: number;
    priceRange: { min: number; max: number };
    currency: 'MYR';
    lastUpdated: string;
  };
  culturalInfo: {
    takeWithFood: boolean;
    ramadanCompliant: boolean;
    prayerTimeConsiderations: string[];
    traditionalAlternatives: string[];
  };
}

export interface MedicationValidationResult {
  isValid: boolean;
  confidence: number;
  matchedMedication?: MedicationDatabaseEntry;
  suggestions: MedicationDatabaseEntry[];
  warnings: string[];
  culturalConsiderations: string[];
}

export interface MedicationReminderSettings {
  enabled: boolean;
  notificationTypes: ('push' | 'sms' | 'email')[];
  advanceNoticeMinutes: number;
  culturalSettings: {
    avoidPrayerTimes: boolean;
    ramadanAdjustments: boolean;
    languagePreference: 'ms' | 'en' | 'zh' | 'ta';
  };
}

export interface MedicationAdherence {
  medicationId: string;
  date: string;
  scheduled: string; // HH:mm
  taken: boolean;
  takenAt?: string; // ISO timestamp
  notes?: string;
  skippedReason?: 'forgot' | 'side_effects' | 'unavailable' | 'prayer_time' | 'fasting' | 'other';
}

export interface MedicationInteractionCheck {
  medicationA: string;
  medicationB: string;
  interactionType: 'major' | 'moderate' | 'minor' | 'none';
  description: string;
  culturalConsiderations?: string;
  recommendation: string;
}

export interface MalaysianPharmacyInfo {
  name: string;
  address: string;
  phone: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  operatingHours: {
    [key: string]: string; // day: hours
  };
  services: ('prescription' | 'consultation' | 'delivery' | '24hour')[];
  halalCertified: boolean;
  languages: string[];
}