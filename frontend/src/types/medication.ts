/**
 * Medication Types for Core Management
 * 
 * Core medication data structures including OCR integration,
 * Malaysian market specifics, and cultural scheduling support.
 */

export interface Medication {
  id: string;
  userId: string;
  name: string;
  genericName?: string;
  brandName?: string;
  dosage: MedicationDosage;
  schedule: MedicationSchedule;
  cultural: MedicationCulturalInfo;
  images: string[]; // Image URIs from photo capture
  ocrData?: OCRResult;
  category: MedicationCategory;
  status: MedicationStatus;
  createdAt: string;
  updatedAt: string;
  lastTaken?: string;
  adherenceRate?: number;
}

export interface MedicationDosage {
  amount: number;
  unit: 'mg' | 'ml' | 'tablet' | 'capsule' | 'drops' | 'puff' | 'patch';
  form: 'tablet' | 'liquid' | 'injection' | 'topical' | 'inhaler' | 'capsule';
  strength?: string; // For complex dosages like "5mg/ml"
  instructions?: string; // Free text instructions
}

export interface MedicationSchedule {
  frequency: 'daily' | 'twice_daily' | 'three_times' | 'four_times' | 'weekly' | 'as_needed' | 'custom';
  times: string[]; // HH:mm format, e.g., ["08:00", "20:00"]
  duration?: MedicationDuration;
  culturalAdjustments: CulturalAdjustments;
  reminders: boolean;
  nextDue?: string; // ISO string
}

export interface MedicationDuration {
  start: string; // ISO date string
  end?: string; // ISO date string, optional for long-term medications
  totalDays?: number; // For course-based medications
  remaining?: number; // Pills/doses remaining
}

export interface CulturalAdjustments {
  takeWithFood: boolean;
  avoidDuringFasting: boolean;
  prayerTimeConsiderations: string[]; // e.g., ["avoid_during_prayer", "take_after_maghrib"]
  ramadanSchedule?: string[]; // Alternative schedule during Ramadan
  prayerTimeBuffer: number; // minutes buffer around prayer times
  mealTimingPreference?: 'before_meal' | 'after_meal' | 'with_meal' | 'empty_stomach';
}

export interface MedicationCulturalInfo {
  takeWithFood: boolean;
  avoidDuringFasting: boolean;
  prayerTimeConsiderations: string[];
  traditionalAlternatives?: string[]; // Traditional medicine alternatives
  culturalNotes?: string; // Special cultural considerations
}

export type MedicationCategory = 
  | 'prescription' 
  | 'otc' 
  | 'supplement' 
  | 'traditional' 
  | 'emergency';

export type MedicationStatus = 
  | 'active' 
  | 'paused' 
  | 'completed' 
  | 'discontinued';

// OCR-related types
export interface OCRResult {
  confidence: number; // 0-1 score
  extractedText: string; // Raw OCR text
  medicationName?: string; // Parsed medication name
  dosageInfo?: string; // Parsed dosage information
  instructions?: string; // Parsed usage instructions
  language: 'ms' | 'en' | 'zh' | 'mixed'; // Detected language
  boundingBoxes: TextBoundingBox[];
  processingTime: number; // milliseconds
  imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TextBoundingBox {
  text: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  type?: 'medication_name' | 'dosage' | 'instructions' | 'manufacturer' | 'other';
}

// Image capture and processing types
export interface CapturedImage {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  format: 'jpg' | 'png';
  quality: number; // 0-1
  metadata?: ImageMetadata;
  processed?: ProcessedImageData;
}

export interface ImageMetadata {
  capturedAt: string; // ISO timestamp
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo: {
    model: string;
    os: string;
    appVersion: string;
  };
  cameraSettings?: {
    flash: boolean;
    focus: 'auto' | 'manual';
    exposure: number;
  };
}

export interface ProcessedImageData {
  originalUri: string;
  processedUri: string;
  transformations: ImageTransformation[];
  optimizedForOCR: boolean;
  processingTime: number;
}

export interface ImageTransformation {
  type: 'crop' | 'rotate' | 'enhance' | 'resize' | 'filter';
  parameters: any;
  appliedAt: string;
}

// Camera service types
export interface CameraPermissions {
  camera: boolean;
  gallery: boolean;
  storage: boolean;
}

export interface CameraConfiguration {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: 'jpg' | 'png';
  enableFlash: boolean;
  autoFocus: boolean;
  optimizeForOCR: boolean;
}

export interface PhotoCaptureOptions {
  source: 'camera' | 'gallery';
  quality: number; // 0-1
  allowsEditing: boolean;
  aspect?: [number, number]; // [4, 3] for 4:3 ratio
  base64?: boolean;
}

// Malaysian medication database types
export interface MalaysianMedicationInfo {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  manufacturer: string;
  registrationNumber: string; // MOH registration
  dosageFormsAvailable: string[];
  strengthsAvailable: string[];
  indicationsMs: string; // In Bahasa Malaysia
  indicationsEn: string; // In English
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  pregnancyCategory?: 'A' | 'B' | 'C' | 'D' | 'X';
  storageInstructions: string;
  availability: 'prescription' | 'otc' | 'controlled';
}

export interface MedicationSearchResult {
  medications: MalaysianMedicationInfo[];
  totalCount: number;
  searchQuery: string;
  filters: MedicationSearchFilters;
  suggestions?: string[];
}

export interface MedicationSearchFilters {
  category?: MedicationCategory;
  availability?: 'prescription' | 'otc' | 'controlled';
  manufacturer?: string;
  dosageForm?: string;
  activeIngredient?: string;
}

// Medication entry and management
export interface MedicationEntry {
  medication: Partial<Medication>;
  source: 'manual' | 'ocr' | 'search';
  confidence?: number; // For OCR entries
  userVerified: boolean;
  entryMethod: 'camera' | 'gallery' | 'manual' | 'search';
}

export interface MedicationUpdateRequest {
  id: string;
  updates: Partial<Medication>;
  reason: string;
  timestamp: string;
}

// Adherence tracking
export interface AdherenceRecord {
  medicationId: string;
  scheduledTime: string; // ISO timestamp
  actualTime?: string; // ISO timestamp when actually taken
  status: 'taken' | 'missed' | 'skipped' | 'delayed';
  notes?: string;
  method: 'automatic' | 'manual' | 'reminder_response';
}

export interface AdherenceStats {
  medicationId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  adherenceRate: number; // 0-100 percentage
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  totalSkipped: number;
  averageDelay: number; // minutes
  trends: AdherenceTrend[];
}

export interface AdherenceTrend {
  date: string;
  rate: number;
  dosesScheduled: number;
  dosesTaken: number;
}