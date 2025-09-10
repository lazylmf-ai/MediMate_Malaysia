/**
 * Malaysian Halal Validation Service
 * Provides halal/haram validation for medications and treatments
 * Integration with JAKIM halal certification database
 */

import axios from 'axios';

export interface HalalStatus {
  status: 'halal' | 'haram' | 'mashbooh' | 'unknown';
  confidence: number;
  certification_body?: string;
  certificate_number?: string;
  expiry_date?: Date;
  last_verified?: Date;
}

export interface MedicationHalalInfo {
  medication_name: string;
  active_ingredients: string[];
  manufacturer: string;
  halal_status: HalalStatus;
  reasoning: string[];
  alternatives?: {
    medication_name: string;
    manufacturer: string;
    halal_status: HalalStatus;
  }[];
  cultural_considerations?: string[];
  religious_guidance?: string[];
}

export interface IngredientInfo {
  name: string;
  source: 'animal' | 'plant' | 'synthetic' | 'mineral' | 'unknown';
  halal_status: HalalStatus;
  concerns?: string[];
  animal_origin?: {
    species: string;
    slaughter_method?: 'halal' | 'non_halal' | 'unknown';
  };
}

export interface TreatmentHalalInfo {
  treatment_name: string;
  treatment_type: 'medication' | 'procedure' | 'therapy' | 'vaccine';
  halal_status: HalalStatus;
  religious_considerations: string[];
  scholar_opinions?: {
    scholar_name: string;
    institution: string;
    opinion: 'permitted' | 'prohibited' | 'conditional';
    conditions?: string[];
    fatwa_reference?: string;
  }[];
  alternative_treatments?: string[];
}

export class HalalValidationService {
  private cache = new Map<string, { data: any; expires: Date }>();
  private readonly CACHE_DURATION_HOURS = 24; // Cache for 24 hours
  private readonly JAKIM_API_BASE = 'https://www.halal.gov.my/v4/index.php/api';
  
  // Common problematic ingredients database
  private readonly HARAM_INGREDIENTS = new Set([
    'gelatin', 'pork gelatin', 'bovine gelatin',
    'alcohol', 'ethanol', 'ethyl alcohol',
    'lard', 'pork fat', 'bacon fat',
    'pepsin', 'rennet', 'lactase',
    'magnesium stearate', // Can be from pork
    'glycerin', 'glycerol', // Can be from pork fat
    'lecithin' // Can be from non-halal sources
  ]);

  // Doubtful (Mashbooh) ingredients
  private readonly MASHBOOH_INGREDIENTS = new Set([
    'natural flavors', 'artificial flavors',
    'mono and diglycerides', 'polysorbate 80',
    'sodium stearyl lactylate', 'calcium stearoyl lactylate',
    'vitamin d3', 'vitamin b12',
    'cysteine', 'whey protein'
  ]);

  // Halal certified manufacturers database (mock)
  private readonly HALAL_MANUFACTURERS = new Map([
    ['pfizer', { certified: true, body: 'JAKIM', expires: new Date('2025-12-31') }],
    ['glaxosmithkline', { certified: true, body: 'MUI', expires: new Date('2025-06-30') }],
    ['novartis', { certified: false, body: null, expires: null }],
    ['roche', { certified: true, body: 'JAKIM', expires: new Date('2025-09-30') }],
    ['sanofi', { certified: true, body: 'JAKIM', expires: new Date('2025-11-30') }]
  ]);

  /**
   * Initialize the halal validation service
   */
  async initialize(): Promise<void> {
    console.log('☪️ Initializing Malaysian Halal Validation Service...');
    
    try {
      await this.loadHalalDatabase();
      await this.validateJakimConnection();
      
      console.log('✅ Halal Validation Service initialized');
    } catch (error) {
      console.warn('⚠️ JAKIM API unavailable, using offline database');
    }
  }

  /**
   * Validate if a medication is halal
   */
  async validateMedication(
    medicationName: string,
    manufacturer?: string,
    activeIngredients?: string[]
  ): Promise<MedicationHalalInfo> {
    const cacheKey = `med_${medicationName}_${manufacturer || 'unknown'}`;
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try JAKIM API first
      const jakimResult = await this.queryJakimDatabase(medicationName, manufacturer);
      if (jakimResult) {
        this.cacheResult(cacheKey, jakimResult);
        return jakimResult;
      }
    } catch (error) {
      console.warn('JAKIM API query failed:', error);
    }

    // Fallback to ingredient analysis
    const result = await this.analyzeIngredients(medicationName, manufacturer, activeIngredients);
    this.cacheResult(cacheKey, result);
    return result;
  }

  /**
   * Validate individual ingredients
   */
  async validateIngredient(ingredientName: string): Promise<IngredientInfo> {
    const normalizedName = ingredientName.toLowerCase().trim();
    
    let halalStatus: HalalStatus;
    let source: IngredientInfo['source'] = 'unknown';
    let concerns: string[] = [];

    if (this.HARAM_INGREDIENTS.has(normalizedName)) {
      halalStatus = {
        status: 'haram',
        confidence: 0.95,
        last_verified: new Date()
      };
      concerns.push('Contains prohibited ingredients according to Islamic dietary laws');
      
      if (normalizedName.includes('pork') || normalizedName.includes('lard')) {
        source = 'animal';
        concerns.push('Contains pork-derived ingredients');
      } else if (normalizedName.includes('alcohol') || normalizedName.includes('ethanol')) {
        concerns.push('Contains alcohol or alcohol-derived ingredients');
      }
    } else if (this.MASHBOOH_INGREDIENTS.has(normalizedName)) {
      halalStatus = {
        status: 'mashbooh',
        confidence: 0.70,
        last_verified: new Date()
      };
      concerns.push('Ingredient source is doubtful and requires further verification');
    } else {
      halalStatus = {
        status: 'unknown',
        confidence: 0.50,
        last_verified: new Date()
      };
      concerns.push('Halal status requires verification with certified authority');
    }

    return {
      name: ingredientName,
      source,
      halal_status: halalStatus,
      concerns: concerns.length > 0 ? concerns : undefined
    };
  }

  /**
   * Validate medical treatment or procedure
   */
  async validateTreatment(
    treatmentName: string,
    treatmentType: TreatmentHalalInfo['treatment_type']
  ): Promise<TreatmentHalalInfo> {
    const normalizedTreatment = treatmentName.toLowerCase();
    
    // Special cases for common treatments
    let halalStatus: HalalStatus;
    let religiousConsiderations: string[] = [];
    let alternativeTreatments: string[] = [];

    if (normalizedTreatment.includes('blood transfusion')) {
      halalStatus = {
        status: 'halal',
        confidence: 0.90,
        certification_body: 'Islamic Medical Association',
        last_verified: new Date()
      };
      religiousConsiderations = [
        'Permitted in life-threatening situations',
        'Must be from halal source when possible',
        'Consult with Islamic scholar for specific cases'
      ];
    } else if (normalizedTreatment.includes('organ transplant')) {
      halalStatus = {
        status: 'halal',
        confidence: 0.85,
        certification_body: 'Islamic Medical Association',
        last_verified: new Date()
      };
      religiousConsiderations = [
        'Permitted to save life',
        'Donor consent is essential',
        'Both donor and recipient must understand Islamic guidelines'
      ];
    } else if (normalizedTreatment.includes('vaccine')) {
      halalStatus = await this.validateVaccine(treatmentName);
      religiousConsiderations = [
        'Generally permitted for disease prevention',
        'Check individual vaccine components',
        'Religious exemptions may apply in specific cases'
      ];
    } else {
      halalStatus = {
        status: 'unknown',
        confidence: 0.60,
        last_verified: new Date()
      };
      religiousConsiderations = [
        'Requires individual assessment',
        'Consult with healthcare provider and Islamic scholar'
      ];
    }

    return {
      treatment_name: treatmentName,
      treatment_type: treatmentType,
      halal_status: halalStatus,
      religious_considerations: religiousConsiderations,
      alternative_treatments: alternativeTreatments.length > 0 ? alternativeTreatments : undefined
    };
  }

  /**
   * Get halal alternatives for a medication
   */
  async getHalalAlternatives(medicationName: string): Promise<MedicationHalalInfo['alternatives']> {
    // Mock alternative medication database
    const alternativesDb: Record<string, any[]> = {
      'insulin': [
        {
          medication_name: 'Human Insulin (Synthetic)',
          manufacturer: 'Novo Nordisk',
          halal_status: {
            status: 'halal',
            confidence: 0.95,
            certification_body: 'JAKIM',
            last_verified: new Date()
          }
        }
      ],
      'paracetamol': [
        {
          medication_name: 'Panadol (Halal Certified)',
          manufacturer: 'GSK',
          halal_status: {
            status: 'halal',
            confidence: 0.98,
            certification_body: 'JAKIM',
            certificate_number: 'JAKIM-HC-2024-001',
            last_verified: new Date()
          }
        }
      ]
    };

    const normalizedName = medicationName.toLowerCase();
    return alternativesDb[normalizedName] || [];
  }

  /**
   * Check manufacturer halal certification
   */
  async checkManufacturerCertification(manufacturer: string): Promise<{
    certified: boolean;
    certification_body?: string;
    certificate_number?: string;
    valid_until?: Date;
    coverage?: string[];
  }> {
    const normalizedManufacturer = manufacturer.toLowerCase();
    const certInfo = this.HALAL_MANUFACTURERS.get(normalizedManufacturer);

    if (!certInfo) {
      return { certified: false };
    }

    return {
      certified: certInfo.certified,
      certification_body: certInfo.body || undefined,
      valid_until: certInfo.expires || undefined,
      coverage: certInfo.certified ? ['pharmaceuticals', 'medical devices'] : undefined
    };
  }

  /**
   * Get Islamic dietary guidelines for medical contexts
   */
  getIslamicMedicalGuidelines(): {
    general_principles: string[];
    emergency_exceptions: string[];
    consultation_advice: string[];
  } {
    return {
      general_principles: [
        'Preservation of life takes precedence over dietary restrictions',
        'Use halal alternatives when available and effective',
        'Avoid haram ingredients unless no alternative exists',
        'Minimal use of doubtful (mashbooh) substances',
        'Inform patients about medication composition'
      ],
      emergency_exceptions: [
        'Life-threatening situations permit use of haram medications',
        'No halal alternative available',
        'Significant health deterioration without treatment',
        'Temporary use until halal alternative is found'
      ],
      consultation_advice: [
        'Consult with knowledgeable Islamic scholar',
        'Discuss with healthcare provider about alternatives',
        'Consider individual circumstances and health conditions',
        'Make informed decision based on Islamic principles'
      ]
    };
  }

  /**
   * Validate Ramadan medication schedule
   */
  async validateRamadanSchedule(
    medications: string[],
    doseTimes: string[]
  ): Promise<{
    ramadan_compatible: boolean;
    adjustments_needed: boolean;
    recommendations: string[];
    alternative_schedules?: string[];
  }> {
    const fastingPeriod = { start: '05:45', end: '19:20' }; // Approximate Malaysian times
    
    let adjustmentsNeeded = false;
    const recommendations: string[] = [];
    const alternativeSchedules: string[] = [];

    for (const doseTime of doseTimes) {
      if (this.isWithinFastingPeriod(doseTime, fastingPeriod)) {
        adjustmentsNeeded = true;
        recommendations.push(`${doseTime} falls during fasting period - adjustment needed`);
        
        // Suggest alternative times
        if (doseTime < '12:00') {
          alternativeSchedules.push('05:30 (before fajr)');
        } else {
          alternativeSchedules.push('19:30 (after maghrib)');
        }
      }
    }

    if (!adjustmentsNeeded) {
      recommendations.push('Current schedule is compatible with Ramadan fasting');
    } else {
      recommendations.push('Consult with healthcare provider for schedule adjustment');
      recommendations.push('Consider long-acting formulations if available');
    }

    return {
      ramadan_compatible: !adjustmentsNeeded,
      adjustments_needed: adjustmentsNeeded,
      recommendations,
      alternative_schedules: alternativeSchedules.length > 0 ? alternativeSchedules : undefined
    };
  }

  // Private methods

  private async loadHalalDatabase(): Promise<void> {
    // Load local halal database (mock implementation)
    console.log('📚 Loading local halal medication database...');
  }

  private async validateJakimConnection(): Promise<void> {
    try {
      // Mock JAKIM API connection test
      const response = await axios.get(`${this.JAKIM_API_BASE}/status`, { timeout: 5000 });
      console.log('✅ JAKIM API connection validated');
    } catch (error) {
      throw new Error('JAKIM API unavailable');
    }
  }

  private async queryJakimDatabase(
    medicationName: string,
    manufacturer?: string
  ): Promise<MedicationHalalInfo | null> {
    try {
      // Mock JAKIM API query
      const response = await axios.get(`${this.JAKIM_API_BASE}/medication`, {
        params: {
          name: medicationName,
          manufacturer: manufacturer
        },
        timeout: 5000
      });

      if (response.data && (response.data as any).halal_status) {
        return this.formatJakimResponse(response.data, medicationName, manufacturer);
      }

      return null;
    } catch (error) {
      console.error('JAKIM query failed:', error);
      return null;
    }
  }

  private formatJakimResponse(
    jakimData: any,
    medicationName: string,
    manufacturer?: string
  ): MedicationHalalInfo {
    return {
      medication_name: medicationName,
      active_ingredients: jakimData.ingredients || [],
      manufacturer: manufacturer || 'Unknown',
      halal_status: {
        status: jakimData.halal_status,
        confidence: 0.95,
        certification_body: 'JAKIM',
        certificate_number: jakimData.certificate_number,
        last_verified: new Date()
      },
      reasoning: jakimData.reasoning || [],
      alternatives: jakimData.alternatives || []
    };
  }

  private async analyzeIngredients(
    medicationName: string,
    manufacturer?: string,
    activeIngredients?: string[]
  ): Promise<MedicationHalalInfo> {
    const ingredients = activeIngredients || [];
    const reasoning: string[] = [];
    let overallStatus: HalalStatus['status'] = 'unknown';
    let confidence = 0.50;

    // Check manufacturer certification
    const manufacturerInfo = manufacturer ? 
      await this.checkManufacturerCertification(manufacturer) : null;

    if (manufacturerInfo?.certified) {
      overallStatus = 'halal';
      confidence = 0.85;
      reasoning.push(`Manufacturer ${manufacturer} is halal certified`);
    }

    // Analyze individual ingredients
    for (const ingredient of ingredients) {
      const ingredientInfo = await this.validateIngredient(ingredient);
      
      if (ingredientInfo.halal_status.status === 'haram') {
        overallStatus = 'haram';
        confidence = 0.90;
        reasoning.push(`Contains haram ingredient: ${ingredient}`);
      } else if (ingredientInfo.halal_status.status === 'mashbooh' && overallStatus !== 'haram') {
        overallStatus = 'mashbooh';
        confidence = 0.70;
        reasoning.push(`Contains doubtful ingredient: ${ingredient}`);
      }
    }

    if (reasoning.length === 0) {
      reasoning.push('No specific halal certification found - verification recommended');
    }

    return {
      medication_name: medicationName,
      active_ingredients: ingredients,
      manufacturer: manufacturer || 'Unknown',
      halal_status: {
        status: overallStatus,
        confidence,
        certification_body: manufacturerInfo?.certified ? manufacturerInfo.certification_body : undefined,
        last_verified: new Date()
      },
      reasoning,
      alternatives: await this.getHalalAlternatives(medicationName),
      cultural_considerations: [
        'Consult with Islamic scholar for specific religious guidance',
        'Consider patient\'s individual religious practices',
        'Inform patient about medication composition'
      ],
      religious_guidance: [
        'Use halal alternatives when medically equivalent',
        'Emergency medical needs may override dietary restrictions',
        'Seek religious consultation for complex cases'
      ]
    };
  }

  private async validateVaccine(vaccineName: string): Promise<HalalStatus> {
    const normalizedName = vaccineName.toLowerCase();
    
    // Common vaccines and their halal status
    const vaccineStatus: Record<string, HalalStatus> = {
      'covid-19': {
        status: 'halal',
        confidence: 0.90,
        certification_body: 'Islamic Medical Association of Malaysia',
        last_verified: new Date()
      },
      'influenza': {
        status: 'halal',
        confidence: 0.85,
        certification_body: 'JAKIM',
        last_verified: new Date()
      },
      'hepatitis': {
        status: 'halal',
        confidence: 0.90,
        certification_body: 'JAKIM',
        last_verified: new Date()
      }
    };

    for (const [vaccine, status] of Object.entries(vaccineStatus)) {
      if (normalizedName.includes(vaccine)) {
        return status;
      }
    }

    return {
      status: 'unknown',
      confidence: 0.60,
      last_verified: new Date()
    };
  }

  private isWithinFastingPeriod(
    time: string,
    fastingPeriod: { start: string; end: string }
  ): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(fastingPeriod.start);
    const endMinutes = this.timeToMinutes(fastingPeriod.end);

    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getCachedResult(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expires > new Date()) {
      return cached.data;
    }
    return null;
  }

  private cacheResult(key: string, data: any): void {
    const expires = new Date();
    expires.setHours(expires.getHours() + this.CACHE_DURATION_HOURS);
    this.cache.set(key, { data, expires });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = new Date();
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
}