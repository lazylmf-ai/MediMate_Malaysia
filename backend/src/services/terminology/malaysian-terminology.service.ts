/**
 * Malaysian Healthcare Terminology Service
 * 
 * Manages Malaysian healthcare terminology including ICD-10-CM, SNOMED CT, LOINC,
 * Malaysian Drug Registration Authority (DRA) codes, and Malaysian-specific
 * healthcare terminologies with multi-language support
 */

import { DatabaseService } from '../database/databaseService';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface TerminologyCode {
  system: string;
  code: string;
  display: string;
  displayMs?: string; // Bahasa Malaysia
  displayZh?: string; // Chinese
  displayTa?: string; // Tamil
  definition?: string;
  active: boolean;
  version?: string;
  effectiveDate?: string;
  expiryDate?: string;
  parent?: string;
  children?: string[];
  properties?: {
    [key: string]: any;
  };
  malaysianContext?: {
    locallyAdapted: boolean;
    mohApproved: boolean;
    clinicalGuidelines?: string[];
    culturalConsiderations?: string[];
  };
}

export interface MalaysianICD10 extends TerminologyCode {
  system: 'https://fhir.moh.gov.my/CodeSystem/icd-10-cm';
  category: 'diagnosis' | 'procedure';
  chapter: string;
  block?: string;
  subcategory?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notifiableDisease?: boolean;
  localPrevalence?: 'common' | 'uncommon' | 'rare' | 'endemic';
  reportingRequirements?: {
    mohReporting: boolean;
    timeframe?: string;
    additionalData?: string[];
  };
}

export interface MalaysianSNOMEDCT extends TerminologyCode {
  system: 'https://fhir.moh.gov.my/CodeSystem/snomed-ct';
  conceptType: 'clinical_finding' | 'procedure' | 'observable_entity' | 'body_structure' | 'substance' | 'organism';
  fullySpecifiedName: string;
  synonyms?: string[];
  relationships?: Array<{
    type: string;
    target: string;
    targetDisplay: string;
  }>;
  malaysianExtension?: {
    traditionalMedicineMapping?: string;
    localTerminology?: string;
    culturalContext?: string[];
  };
}

export interface MalaysianLOINC extends TerminologyCode {
  system: 'https://fhir.moh.gov.my/CodeSystem/loinc';
  component: string;
  property: string;
  timeAspect: string;
  system_measured: string;
  scale: string;
  method?: string;
  class: string;
  specimen?: string;
  referenceRanges?: Array<{
    population: 'adult_male' | 'adult_female' | 'pediatric' | 'newborn' | 'geriatric';
    ethnicity?: 'malay' | 'chinese' | 'indian' | 'other';
    unit: string;
    lowValue?: number;
    highValue?: number;
    textRange?: string;
  }>;
  malaysianAdaptation?: {
    localUnits?: string;
    localReferenceRanges?: boolean;
    populationSpecific?: boolean;
  };
}

export interface MalaysianDRACode extends TerminologyCode {
  system: 'https://fhir.moh.gov.my/CodeSystem/dra-drugs';
  registrationNumber: string;
  genericName: string;
  brandName: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  atcCode?: string;
  therapeuticClass: string;
  controlledSubstance?: boolean;
  halalStatus: 'certified_halal' | 'halal_ingredients' | 'non_halal' | 'syubhah' | 'unknown';
  registrationStatus: 'active' | 'suspended' | 'cancelled' | 'expired';
  priceControl?: {
    controlled: boolean;
    maximumPrice?: number;
    subsidized?: boolean;
  };
}

export interface TerminologySearchParams {
  system?: string;
  code?: string;
  display?: string;
  language?: 'en' | 'ms' | 'zh' | 'ta';
  category?: string;
  active?: boolean;
  version?: string;
  count?: number;
  offset?: number;
}

export interface TerminologySearchResult {
  total: number;
  codes: TerminologyCode[];
  facets?: {
    [key: string]: Array<{
      value: string;
      count: number;
    }>;
  };
}

export interface ConceptMapping {
  id: string;
  sourceSystem: string;
  sourceCode: string;
  targetSystem: string;
  targetCode: string;
  equivalence: 'equivalent' | 'equal' | 'wider' | 'subsumes' | 'narrower' | 'specializes' | 'inexact' | 'unmatched' | 'disjoint';
  comment?: string;
  malaysianContext?: {
    clinicallyEquivalent: boolean;
    culturallyAppropriate: boolean;
    localPreference?: string;
  };
  active: boolean;
  lastUpdated: string;
}

export class MalaysianTerminologyService {
  private static instance: MalaysianTerminologyService;
  private db: DatabaseService;

  // Malaysian-specific terminology systems
  private readonly MALAYSIAN_SYSTEMS = {
    ICD10: 'https://fhir.moh.gov.my/CodeSystem/icd-10-cm',
    SNOMED: 'https://fhir.moh.gov.my/CodeSystem/snomed-ct',
    LOINC: 'https://fhir.moh.gov.my/CodeSystem/loinc',
    DRA_DRUGS: 'https://fhir.moh.gov.my/CodeSystem/dra-drugs',
    MALAYSIAN_SPECIALTIES: 'https://fhir.moh.gov.my/CodeSystem/medical-specialties',
    MALAYSIAN_FACILITIES: 'https://fhir.moh.gov.my/CodeSystem/facility-types',
    TRADITIONAL_MEDICINE: 'https://fhir.moh.gov.my/CodeSystem/traditional-medicine',
    NOTIFIABLE_DISEASES: 'https://fhir.moh.gov.my/CodeSystem/notifiable-diseases',
    HEALTHCARE_SERVICES: 'https://fhir.moh.gov.my/CodeSystem/healthcare-services'
  } as const;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): MalaysianTerminologyService {
    if (!MalaysianTerminologyService.instance) {
      MalaysianTerminologyService.instance = new MalaysianTerminologyService();
    }
    return MalaysianTerminologyService.instance;
  }

  /**
   * Search terminology codes
   */
  public async searchCodes(params: TerminologySearchParams): Promise<TerminologySearchResult> {
    try {
      const connection = this.db.getConnection();
      
      let query = 'SELECT * FROM terminology_codes WHERE active = true';
      const queryParams: any[] = [];
      let paramIndex = 1;
      const conditions: string[] = [];

      // Build search conditions
      if (params.system) {
        conditions.push(`system = $${paramIndex}`);
        queryParams.push(params.system);
        paramIndex++;
      }

      if (params.code) {
        conditions.push(`code ILIKE $${paramIndex}`);
        queryParams.push(`%${params.code}%`);
        paramIndex++;
      }

      if (params.display) {
        const displayCondition = params.language ? 
          `(display ILIKE $${paramIndex} OR display_${params.language} ILIKE $${paramIndex})` :
          `(display ILIKE $${paramIndex} OR display_ms ILIKE $${paramIndex} OR display_zh ILIKE $${paramIndex} OR display_ta ILIKE $${paramIndex})`;
        conditions.push(displayCondition);
        queryParams.push(`%${params.display}%`);
        paramIndex++;
      }

      if (params.category) {
        conditions.push(`properties->>'category' = $${paramIndex}`);
        queryParams.push(params.category);
        paramIndex++;
      }

      if (params.version) {
        conditions.push(`version = $${paramIndex}`);
        queryParams.push(params.version);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const totalResult = await connection.one(countQuery, queryParams);
      const total = parseInt(totalResult.count);

      // Add ordering and pagination
      query += ' ORDER BY system, code';
      
      if (params.count) {
        query += ` LIMIT $${paramIndex}`;
        queryParams.push(params.count);
        paramIndex++;
      }

      if (params.offset) {
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(params.offset);
        paramIndex++;
      }

      const results = await connection.manyOrNone(query, queryParams);

      const codes: TerminologyCode[] = results.map((row: any) => ({
        system: row.system,
        code: row.code,
        display: row.display,
        displayMs: row.display_ms,
        displayZh: row.display_zh,
        displayTa: row.display_ta,
        definition: row.definition,
        active: row.active,
        version: row.version,
        effectiveDate: row.effective_date,
        expiryDate: row.expiry_date,
        parent: row.parent,
        children: row.children || [],
        properties: row.properties || {},
        malaysianContext: row.malaysian_context || undefined
      }));

      return {
        total,
        codes
      };

    } catch (error) {
      console.error('Terminology search failed:', error);
      throw new Error(`Terminology search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specific terminology code
   */
  public async getCode(system: string, code: string, version?: string): Promise<TerminologyCode | null> {
    try {
      const connection = this.db.getConnection();
      
      let query = 'SELECT * FROM terminology_codes WHERE system = $1 AND code = $2 AND active = true';
      const params = [system, code];

      if (version) {
        query += ' AND version = $3';
        params.push(version);
      }

      const result = await connection.oneOrNone(query, params);

      if (!result) return null;

      return {
        system: result.system,
        code: result.code,
        display: result.display,
        displayMs: result.display_ms,
        displayZh: result.display_zh,
        displayTa: result.display_ta,
        definition: result.definition,
        active: result.active,
        version: result.version,
        effectiveDate: result.effective_date,
        expiryDate: result.expiry_date,
        parent: result.parent,
        children: result.children || [],
        properties: result.properties || {},
        malaysianContext: result.malaysian_context || undefined
      };

    } catch (error) {
      console.error('Failed to get terminology code:', error);
      throw new Error(`Failed to get terminology code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate terminology code
   */
  public async validateCode(system: string, code: string, display?: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const terminologyCode = await this.getCode(system, code);
      
      if (!terminologyCode) {
        return {
          valid: false,
          message: `Code '${code}' not found in system '${system}'`
        };
      }

      if (!terminologyCode.active) {
        return {
          valid: false,
          message: `Code '${code}' is inactive in system '${system}'`
        };
      }

      if (display && !this.isDisplayMatch(terminologyCode, display)) {
        return {
          valid: false,
          message: `Display '${display}' does not match expected display for code '${code}'`
        };
      }

      return { valid: true };

    } catch (error) {
      console.error('Code validation failed:', error);
      return {
        valid: false,
        message: `Code validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get concept mappings between terminology systems
   */
  public async getConceptMappings(sourceSystem: string, sourceCode: string, targetSystem?: string): Promise<ConceptMapping[]> {
    try {
      const connection = this.db.getConnection();
      
      let query = `
        SELECT * FROM concept_mappings 
        WHERE source_system = $1 AND source_code = $2 AND active = true
      `;
      const params = [sourceSystem, sourceCode];

      if (targetSystem) {
        query += ' AND target_system = $3';
        params.push(targetSystem);
      }

      query += ' ORDER BY target_system, equivalence';

      const results = await connection.manyOrNone(query, params);

      return results.map((row: any) => ({
        id: row.id,
        sourceSystem: row.source_system,
        sourceCode: row.source_code,
        targetSystem: row.target_system,
        targetCode: row.target_code,
        equivalence: row.equivalence,
        comment: row.comment,
        malaysianContext: row.malaysian_context || undefined,
        active: row.active,
        lastUpdated: row.last_updated
      }));

    } catch (error) {
      console.error('Failed to get concept mappings:', error);
      throw new Error(`Failed to get concept mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Translate code from one system to another
   */
  public async translateCode(sourceSystem: string, sourceCode: string, targetSystem: string): Promise<{
    translated: boolean;
    targetCode?: string;
    targetDisplay?: string;
    equivalence?: string;
    message?: string;
  }> {
    try {
      const mappings = await this.getConceptMappings(sourceSystem, sourceCode, targetSystem);
      
      if (mappings.length === 0) {
        return {
          translated: false,
          message: `No mapping found from ${sourceSystem} code '${sourceCode}' to ${targetSystem}`
        };
      }

      // Find the best mapping (prefer 'equivalent' or 'equal')
      const bestMapping = mappings.find(m => m.equivalence === 'equivalent' || m.equivalence === 'equal') || mappings[0];
      
      const targetCode = await this.getCode(targetSystem, bestMapping.targetCode);
      
      if (!targetCode) {
        return {
          translated: false,
          message: `Target code '${bestMapping.targetCode}' not found in system '${targetSystem}'`
        };
      }

      return {
        translated: true,
        targetCode: bestMapping.targetCode,
        targetDisplay: targetCode.display,
        equivalence: bestMapping.equivalence
      };

    } catch (error) {
      console.error('Code translation failed:', error);
      return {
        translated: false,
        message: `Code translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get Malaysian ICD-10 codes for notifiable diseases
   */
  public async getNotifiableDiseases(): Promise<MalaysianICD10[]> {
    try {
      const connection = this.db.getConnection();
      
      const results = await connection.manyOrNone(`
        SELECT * FROM terminology_codes 
        WHERE system = $1 
          AND active = true 
          AND properties->>'notifiableDisease' = 'true'
        ORDER BY display
      `, [this.MALAYSIAN_SYSTEMS.ICD10]);

      return results.map((row: any) => ({
        system: row.system,
        code: row.code,
        display: row.display,
        displayMs: row.display_ms,
        displayZh: row.display_zh,
        displayTa: row.display_ta,
        definition: row.definition,
        active: row.active,
        version: row.version,
        category: row.properties?.category || 'diagnosis',
        chapter: row.properties?.chapter || '',
        notifiableDisease: true,
        localPrevalence: row.properties?.localPrevalence,
        reportingRequirements: row.properties?.reportingRequirements,
        malaysianContext: row.malaysian_context
      }));

    } catch (error) {
      console.error('Failed to get notifiable diseases:', error);
      throw new Error(`Failed to get notifiable diseases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Malaysian drug codes by therapeutic class
   */
  public async getDrugsByTherapeuticClass(therapeuticClass: string): Promise<MalaysianDRACode[]> {
    try {
      const connection = this.db.getConnection();
      
      const results = await connection.manyOrNone(`
        SELECT * FROM terminology_codes 
        WHERE system = $1 
          AND active = true 
          AND properties->>'therapeuticClass' = $2
        ORDER BY display
      `, [this.MALAYSIAN_SYSTEMS.DRA_DRUGS, therapeuticClass]);

      return results.map((row: any) => this.mapToDRACode(row));

    } catch (error) {
      console.error('Failed to get drugs by therapeutic class:', error);
      throw new Error(`Failed to get drugs by therapeutic class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get halal-certified medications
   */
  public async getHalalCertifiedMedications(): Promise<MalaysianDRACode[]> {
    try {
      const connection = this.db.getConnection();
      
      const results = await connection.manyOrNone(`
        SELECT * FROM terminology_codes 
        WHERE system = $1 
          AND active = true 
          AND properties->>'halalStatus' IN ('certified_halal', 'halal_ingredients')
        ORDER BY display
      `, [this.MALAYSIAN_SYSTEMS.DRA_DRUGS]);

      return results.map((row: any) => this.mapToDRACode(row));

    } catch (error) {
      console.error('Failed to get halal certified medications:', error);
      throw new Error(`Failed to get halal certified medications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync terminology data from external sources
   */
  public async syncTerminologyData(system: string): Promise<{ synced: number; errors: number }> {
    try {
      let synced = 0;
      let errors = 0;

      switch (system) {
        case this.MALAYSIAN_SYSTEMS.ICD10:
          const icdResult = await this.syncICD10Data();
          synced += icdResult.synced;
          errors += icdResult.errors;
          break;
          
        case this.MALAYSIAN_SYSTEMS.DRA_DRUGS:
          const draResult = await this.syncDRAData();
          synced += draResult.synced;
          errors += draResult.errors;
          break;
          
        default:
          throw new Error(`Unsupported terminology system: ${system}`);
      }

      console.log(`Terminology sync completed for ${system}: ${synced} synced, ${errors} errors`);
      return { synced, errors };

    } catch (error) {
      console.error('Terminology sync failed:', error);
      throw new Error(`Terminology sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isDisplayMatch(terminologyCode: TerminologyCode, display: string): boolean {
    const displays = [
      terminologyCode.display,
      terminologyCode.displayMs,
      terminologyCode.displayZh,
      terminologyCode.displayTa
    ].filter(Boolean);

    return displays.some(d => d!.toLowerCase() === display.toLowerCase());
  }

  private mapToDRACode(row: any): MalaysianDRACode {
    return {
      system: row.system,
      code: row.code,
      display: row.display,
      displayMs: row.display_ms,
      displayZh: row.display_zh,
      displayTa: row.display_ta,
      definition: row.definition,
      active: row.active,
      version: row.version,
      registrationNumber: row.code,
      genericName: row.properties?.genericName || '',
      brandName: row.display,
      manufacturer: row.properties?.manufacturer || '',
      dosageForm: row.properties?.dosageForm || '',
      strength: row.properties?.strength || '',
      atcCode: row.properties?.atcCode,
      therapeuticClass: row.properties?.therapeuticClass || '',
      controlledSubstance: row.properties?.controlledSubstance || false,
      halalStatus: row.properties?.halalStatus || 'unknown',
      registrationStatus: row.properties?.registrationStatus || 'active',
      priceControl: row.properties?.priceControl,
      malaysianContext: row.malaysian_context
    };
  }

  private async syncICD10Data(): Promise<{ synced: number; errors: number }> {
    // Implementation would sync with MOH ICD-10 data source
    // For now, return mock data
    return { synced: 0, errors: 0 };
  }

  private async syncDRAData(): Promise<{ synced: number; errors: number }> {
    // Implementation would sync with Drug Registration Authority
    // For now, return mock data
    return { synced: 0, errors: 0 };
  }

  /**
   * Create or update terminology code
   */
  public async upsertCode(terminologyCode: TerminologyCode): Promise<{ success: boolean; id?: string }> {
    try {
      const connection = this.db.getConnection();
      const id = uuidv4();

      await connection.none(`
        INSERT INTO terminology_codes (
          id, system, code, display, display_ms, display_zh, display_ta,
          definition, active, version, effective_date, expiry_date,
          parent, children, properties, malaysian_context, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        ON CONFLICT (system, code, version)
        DO UPDATE SET
          display = $4, display_ms = $5, display_zh = $6, display_ta = $7,
          definition = $8, active = $9, effective_date = $11, expiry_date = $12,
          parent = $13, children = $14, properties = $15, malaysian_context = $16,
          updated_at = NOW()
      `, [
        id,
        terminologyCode.system,
        terminologyCode.code,
        terminologyCode.display,
        terminologyCode.displayMs,
        terminologyCode.displayZh,
        terminologyCode.displayTa,
        terminologyCode.definition,
        terminologyCode.active,
        terminologyCode.version || '1.0',
        terminologyCode.effectiveDate,
        terminologyCode.expiryDate,
        terminologyCode.parent,
        JSON.stringify(terminologyCode.children || []),
        JSON.stringify(terminologyCode.properties || {}),
        JSON.stringify(terminologyCode.malaysianContext)
      ]);

      return { success: true, id };

    } catch (error) {
      console.error('Failed to upsert terminology code:', error);
      return { success: false };
    }
  }

  /**
   * Get terminology system metadata
   */
  public async getSystemMetadata(system: string): Promise<{
    system: string;
    version: string;
    totalCodes: number;
    activeCodes: number;
    lastUpdated: string;
    languages: string[];
    categories: string[];
  } | null> {
    try {
      const connection = this.db.getConnection();
      
      const metadata = await connection.oneOrNone(`
        SELECT 
          system,
          version,
          COUNT(*) as total_codes,
          COUNT(CASE WHEN active = true THEN 1 END) as active_codes,
          MAX(updated_at) as last_updated,
          array_agg(DISTINCT properties->>'category') as categories
        FROM terminology_codes 
        WHERE system = $1
        GROUP BY system, version
        ORDER BY version DESC
        LIMIT 1
      `, [system]);

      if (!metadata) return null;

      return {
        system: metadata.system,
        version: metadata.version || '1.0',
        totalCodes: parseInt(metadata.total_codes),
        activeCodes: parseInt(metadata.active_codes),
        lastUpdated: metadata.last_updated,
        languages: ['en', 'ms', 'zh', 'ta'], // All Malaysian systems support these languages
        categories: metadata.categories?.filter(c => c) || []
      };

    } catch (error) {
      console.error('Failed to get system metadata:', error);
      return null;
    }
  }
}

export default MalaysianTerminologyService;