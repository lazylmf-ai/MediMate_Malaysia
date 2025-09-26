/**
 * Medication Service
 *
 * Core medication management with Malaysian drug database integration
 * Provides CRUD operations, validation, and cultural adaptations
 */

import { DatabaseService } from '../database/databaseService';
import { CacheService } from '../cache/redisService';
import {
  Medication,
  MedicationDatabaseEntry,
  MedicationSearchParams,
  MedicationValidationResult,
  MedicationStatus,
  OCRResult,
  MalaysianMedicationInfo,
  HalalStatus
} from '../../types/medication/medication.types';
import { v4 as uuidv4 } from 'uuid';

export class MedicationService {
  private static instance: MedicationService;
  private db: DatabaseService;
  private cache: CacheService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
  }

  public static getInstance(): MedicationService {
    if (!MedicationService.instance) {
      MedicationService.instance = new MedicationService();
    }
    return MedicationService.instance;
  }

  /**
   * Get user medications with filtering and pagination
   */
  async getUserMedications(
    userId: string,
    options: {
      status?: MedicationStatus;
      category?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ medications: Medication[]; total: number }> {
    const { status, category, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT m.*,
             mmi.moh_registration,
             mmi.dca_registration,
             mmi.local_manufacturer,
             mmi.availability,
             mmi.halal_certified,
             mmi.pricing_info,
             array_agg(DISTINCT ma.alternative_name) as local_alternatives
      FROM medications m
      LEFT JOIN malaysian_medication_info mmi ON m.id = mmi.medication_id
      LEFT JOIN medication_alternatives ma ON m.generic_name = ma.generic_name
      WHERE m.user_id = $1
    `;

    const params: any[] = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND m.status = $${paramCount}`;
      params.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND m.category = $${paramCount}`;
      params.push(category);
    }

    query += `
      GROUP BY m.id, mmi.moh_registration, mmi.dca_registration, mmi.local_manufacturer,
               mmi.availability, mmi.halal_certified, mmi.pricing_info
      ORDER BY m.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM medications m
      WHERE m.user_id = $1
    `;

    const countParams = [userId];
    let countParamIndex = 1;

    if (status) {
      countParamIndex++;
      countQuery += ` AND m.status = $${countParamIndex}`;
      countParams.push(status);
    }

    if (category) {
      countParamIndex++;
      countQuery += ` AND m.category = $${countParamIndex}`;
      countParams.push(category);
    }

    try {
      const [medications, countResult] = await Promise.all([
        this.db.query(query, params),
        this.db.one(countQuery, countParams)
      ]);

      const transformedMedications = medications.map(this.transformDatabaseMedication);

      return {
        medications: transformedMedications,
        total: parseInt(countResult.total)
      };
    } catch (error) {
      throw new Error(`Failed to retrieve user medications: ${error.message}`);
    }
  }

  /**
   * Get specific medication by ID
   */
  async getMedicationById(medicationId: string, userId: string): Promise<Medication | null> {
    const cacheKey = `medication:${medicationId}:${userId}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const query = `
      SELECT m.*,
             mmi.moh_registration,
             mmi.dca_registration,
             mmi.local_manufacturer,
             mmi.availability,
             mmi.halal_certified,
             mmi.pricing_info,
             array_agg(DISTINCT ma.alternative_name) as local_alternatives,
             array_agg(DISTINCT mi.image_url) as medication_images
      FROM medications m
      LEFT JOIN malaysian_medication_info mmi ON m.id = mmi.medication_id
      LEFT JOIN medication_alternatives ma ON m.generic_name = ma.generic_name
      LEFT JOIN medication_images mi ON m.id = mi.medication_id
      WHERE m.id = $1 AND m.user_id = $2
      GROUP BY m.id, mmi.moh_registration, mmi.dca_registration, mmi.local_manufacturer,
               mmi.availability, mmi.halal_certified, mmi.pricing_info
    `;

    try {
      const result = await this.db.oneOrNone(query, [medicationId, userId]);

      if (!result) {
        return null;
      }

      const medication = this.transformDatabaseMedication(result);

      // Cache for 5 minutes
      await this.cache.set(cacheKey, JSON.stringify(medication), 300);

      return medication;
    } catch (error) {
      throw new Error(`Failed to retrieve medication: ${error.message}`);
    }
  }

  /**
   * Create new medication
   */
  async createMedication(medicationData: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
    const medicationId = uuidv4();
    const now = new Date().toISOString();

    const medication: Medication = {
      ...medicationData,
      id: medicationId,
      createdAt: now,
      updatedAt: now
    };

    // Validate against Malaysian drug database
    const validation = await this.validateAgainstMalaysianDatabase(medication);

    const query = `
      INSERT INTO medications (
        id, user_id, name, generic_name, brand_name, dosage_amount, dosage_unit,
        dosage_form, dosage_strength, dosage_instructions, schedule_frequency,
        schedule_times, schedule_duration, cultural_take_with_food,
        cultural_avoid_fasting, cultural_prayer_considerations, status, category,
        prescription_info, ocr_data, images, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING *
    `;

    const params = [
      medication.id,
      medication.userId,
      medication.name,
      medication.genericName,
      medication.brandName,
      medication.dosage.amount,
      medication.dosage.unit,
      medication.dosage.form,
      medication.dosage.strength,
      medication.dosage.instructions,
      medication.schedule.frequency,
      JSON.stringify(medication.schedule.times),
      medication.schedule.duration ? JSON.stringify(medication.schedule.duration) : null,
      medication.cultural.takeWithFood,
      medication.cultural.avoidDuringFasting,
      JSON.stringify(medication.cultural.prayerTimeConsiderations),
      medication.status,
      medication.category,
      medication.prescriptionInfo ? JSON.stringify(medication.prescriptionInfo) : null,
      medication.ocrData ? JSON.stringify(medication.ocrData) : null,
      JSON.stringify(medication.images || []),
      medication.createdAt,
      medication.updatedAt
    ];

    try {
      // Start transaction
      return await this.db.tx(async (t) => {
        // Insert main medication record
        const result = await t.one(query, params);

        // Insert Malaysian medication info if validation found a match
        if (validation.matchedMedication) {
          await this.insertMalaysianMedicationInfo(t, medicationId, validation.matchedMedication);
        }

        // Insert medication images if any
        if (medication.images && medication.images.length > 0) {
          await this.insertMedicationImages(t, medicationId, medication.images);
        }

        // Clear user medications cache
        await this.cache.del(`user_medications:${medication.userId}`);

        return this.transformDatabaseMedication(result);
      });
    } catch (error) {
      throw new Error(`Failed to create medication: ${error.message}`);
    }
  }

  /**
   * Update existing medication
   */
  async updateMedication(
    medicationId: string,
    userId: string,
    updates: Partial<Medication>
  ): Promise<Medication> {
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    const fieldMappings = {
      name: 'name',
      genericName: 'generic_name',
      brandName: 'brand_name',
      status: 'status',
      category: 'category'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (key in fieldMappings && value !== undefined) {
        paramCount++;
        updateFields.push(`${fieldMappings[key]} = $${paramCount}`);
        params.push(value);
      }
    });

    if (updates.dosage) {
      paramCount++;
      updateFields.push(`dosage_amount = $${paramCount}`);
      params.push(updates.dosage.amount);

      paramCount++;
      updateFields.push(`dosage_unit = $${paramCount}`);
      params.push(updates.dosage.unit);

      paramCount++;
      updateFields.push(`dosage_form = $${paramCount}`);
      params.push(updates.dosage.form);
    }

    if (updates.schedule) {
      paramCount++;
      updateFields.push(`schedule_frequency = $${paramCount}`);
      params.push(updates.schedule.frequency);

      paramCount++;
      updateFields.push(`schedule_times = $${paramCount}`);
      params.push(JSON.stringify(updates.schedule.times));
    }

    if (updates.cultural) {
      paramCount++;
      updateFields.push(`cultural_take_with_food = $${paramCount}`);
      params.push(updates.cultural.takeWithFood);

      paramCount++;
      updateFields.push(`cultural_avoid_fasting = $${paramCount}`);
      params.push(updates.cultural.avoidDuringFasting);
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    params.push(now);

    params.push(medicationId, userId);

    const query = `
      UPDATE medications
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
      RETURNING *
    `;

    try {
      const result = await this.db.oneOrNone(query, params);

      if (!result) {
        throw new Error('Medication not found or unauthorized');
      }

      // Clear caches
      await Promise.all([
        this.cache.del(`medication:${medicationId}:${userId}`),
        this.cache.del(`user_medications:${userId}`)
      ]);

      return this.transformDatabaseMedication(result);
    } catch (error) {
      throw new Error(`Failed to update medication: ${error.message}`);
    }
  }

  /**
   * Delete medication
   */
  async deleteMedication(medicationId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM medications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    try {
      const result = await this.db.oneOrNone(query, [medicationId, userId]);

      if (result) {
        // Clear caches
        await Promise.all([
          this.cache.del(`medication:${medicationId}:${userId}`),
          this.cache.del(`user_medications:${userId}`)
        ]);

        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to delete medication: ${error.message}`);
    }
  }

  /**
   * Search Malaysian drug database
   */
  async searchMalaysianDrugDatabase(params: MedicationSearchParams): Promise<MedicationDatabaseEntry[]> {
    const cacheKey = `drug_search:${JSON.stringify(params)}`;

    // Check cache first (5 minutes)
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let query = `
      SELECT mdd.*,
             array_agg(DISTINCT mdd_alt.brand_name) as brand_names,
             array_agg(DISTINCT mdd_df.form) as dosage_forms,
             array_agg(DISTINCT mdd_str.strength) as strengths
      FROM malaysian_drug_database mdd
      LEFT JOIN malaysian_drug_alternatives mdd_alt ON mdd.id = mdd_alt.drug_id
      LEFT JOIN malaysian_drug_dosage_forms mdd_df ON mdd.id = mdd_df.drug_id
      LEFT JOIN malaysian_drug_strengths mdd_str ON mdd.id = mdd_str.drug_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramCount = 0;

    if (params.query) {
      paramCount++;
      query += ` AND (
        LOWER(mdd.name) LIKE LOWER($${paramCount})
        OR LOWER(mdd.generic_name) LIKE LOWER($${paramCount})
        OR EXISTS (
          SELECT 1 FROM malaysian_drug_alternatives mda
          WHERE mda.drug_id = mdd.id AND LOWER(mda.brand_name) LIKE LOWER($${paramCount})
        )
      )`;
      queryParams.push(`%${params.query}%`);
    }

    if (params.halalOnly) {
      query += ` AND mdd.halal_certified = true`;
    }

    if (params.type && params.type !== 'all') {
      paramCount++;
      if (params.type === 'brand') {
        query += ` AND EXISTS (
          SELECT 1 FROM malaysian_drug_alternatives mda
          WHERE mda.drug_id = mdd.id
        )`;
      } else if (params.type === 'generic') {
        query += ` AND mdd.generic_name IS NOT NULL`;
      }
    }

    query += `
      GROUP BY mdd.id, mdd.name, mdd.generic_name, mdd.manufacturer,
               mdd.moh_registration, mdd.halal_certified, mdd.availability
      ORDER BY
        CASE WHEN LOWER(mdd.name) = LOWER($1) THEN 0 ELSE 1 END,
        mdd.name
      LIMIT 50
    `;

    try {
      const results = await this.db.any(query, queryParams);
      const transformedResults = results.map(this.transformDatabaseDrugEntry);

      // Cache results for 5 minutes
      await this.cache.set(cacheKey, JSON.stringify(transformedResults), 300);

      return transformedResults;
    } catch (error) {
      throw new Error(`Failed to search Malaysian drug database: ${error.message}`);
    }
  }

  /**
   * Validate medication against Malaysian database
   */
  async validateAgainstMalaysianDatabase(medication: Medication): Promise<MedicationValidationResult> {
    const searchParams: MedicationSearchParams = {
      query: medication.genericName || medication.name,
      type: 'generic',
      halalOnly: medication.cultural.halalStatus?.isHalal || false
    };

    try {
      const matches = await this.searchMalaysianDrugDatabase(searchParams);

      if (matches.length === 0) {
        return {
          isValid: false,
          confidence: 0,
          suggestions: [],
          warnings: ['Medication not found in Malaysian drug database'],
          culturalConsiderations: []
        };
      }

      const exactMatch = matches.find(m =>
        m.genericName.toLowerCase() === (medication.genericName || medication.name).toLowerCase()
      );

      if (exactMatch) {
        return {
          isValid: true,
          confidence: 0.95,
          matchedMedication: exactMatch,
          suggestions: matches.slice(1, 4),
          warnings: [],
          culturalConsiderations: this.generateCulturalConsiderations(exactMatch)
        };
      }

      return {
        isValid: false,
        confidence: 0.3,
        suggestions: matches.slice(0, 5),
        warnings: ['Exact match not found, similar medications available'],
        culturalConsiderations: []
      };
    } catch (error) {
      throw new Error(`Failed to validate medication: ${error.message}`);
    }
  }

  /**
   * Process OCR results and create medication
   */
  async createMedicationFromOCR(ocrResult: OCRResult, userId: string): Promise<Medication> {
    // Extract medication information from OCR
    const medicationName = this.extractMedicationNameFromOCR(ocrResult);
    const dosageInfo = this.extractDosageFromOCR(ocrResult);

    const medicationData: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      name: medicationName,
      genericName: await this.findGenericName(medicationName),
      dosage: dosageInfo,
      schedule: {
        frequency: 'daily',
        times: ['08:00'],
        culturalAdjustments: {
          prayerTimeBuffer: 15,
          takeWithFood: false,
          avoidDuringFasting: false,
          prayerTimeConsiderations: []
        }
      },
      cultural: {
        takeWithFood: false,
        avoidDuringFasting: false,
        prayerTimeConsiderations: [],
        halalStatus: {
          isHalal: false,
          concerns: [],
        },
        languagePreference: ocrResult.language === 'mixed' ? 'ms' : ocrResult.language
      },
      images: [],
      ocrData: ocrResult,
      status: 'active',
      category: 'otc',
      malaysianInfo: {
        availability: 'widely_available',
        halalCertified: ocrResult.culturalPatterns.halalIndicators.length > 0,
        localAlternatives: []
      }
    };

    return await this.createMedication(medicationData);
  }

  // Private helper methods

  private transformDatabaseMedication(row: any): Medication {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      genericName: row.generic_name,
      brandName: row.brand_name,
      dosage: {
        amount: row.dosage_amount,
        unit: row.dosage_unit,
        form: row.dosage_form,
        strength: row.dosage_strength,
        instructions: row.dosage_instructions
      },
      schedule: {
        frequency: row.schedule_frequency,
        times: JSON.parse(row.schedule_times || '[]'),
        duration: row.schedule_duration ? JSON.parse(row.schedule_duration) : undefined,
        culturalAdjustments: {
          prayerTimeBuffer: 15,
          takeWithFood: row.cultural_take_with_food || false,
          avoidDuringFasting: row.cultural_avoid_fasting || false,
          prayerTimeConsiderations: JSON.parse(row.cultural_prayer_considerations || '[]')
        }
      },
      cultural: {
        takeWithFood: row.cultural_take_with_food || false,
        avoidDuringFasting: row.cultural_avoid_fasting || false,
        prayerTimeConsiderations: JSON.parse(row.cultural_prayer_considerations || '[]'),
        halalStatus: {
          isHalal: row.halal_certified || false,
          concerns: []
        },
        languagePreference: 'ms'
      },
      images: JSON.parse(row.images || '[]'),
      ocrData: row.ocr_data ? JSON.parse(row.ocr_data) : undefined,
      status: row.status,
      category: row.category,
      prescriptionInfo: row.prescription_info ? JSON.parse(row.prescription_info) : undefined,
      malaysianInfo: {
        mohRegistration: row.moh_registration,
        dcaRegistration: row.dca_registration,
        localManufacturer: row.local_manufacturer,
        availability: row.availability || 'widely_available',
        halalCertified: row.halal_certified || false,
        localAlternatives: row.local_alternatives || []
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformDatabaseDrugEntry(row: any): MedicationDatabaseEntry {
    return {
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      brandNames: row.brand_names || [],
      manufacturer: row.manufacturer,
      mohRegistration: row.moh_registration,
      dcaRegistration: row.dca_registration,
      halalCertified: row.halal_certified,
      availability: row.availability,
      dosageForms: row.dosage_forms || [],
      strengths: row.strengths || [],
      interactions: JSON.parse(row.interactions || '[]'),
      sideEffects: JSON.parse(row.side_effects || '[]'),
      contraindications: JSON.parse(row.contraindications || '[]'),
      instructions: JSON.parse(row.instructions || '{"ms": "", "en": ""}'),
      pricing: row.pricing_info ? JSON.parse(row.pricing_info) : undefined,
      culturalInfo: {
        takeWithFood: row.take_with_food || false,
        ramadanCompliant: row.ramadan_compliant || true,
        prayerTimeConsiderations: JSON.parse(row.prayer_considerations || '[]'),
        traditionalAlternatives: JSON.parse(row.traditional_alternatives || '[]')
      }
    };
  }

  private async insertMalaysianMedicationInfo(t: any, medicationId: string, drugEntry: MedicationDatabaseEntry): Promise<void> {
    const query = `
      INSERT INTO malaysian_medication_info (
        medication_id, moh_registration, dca_registration, local_manufacturer,
        availability, halal_certified, pricing_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await t.none(query, [
      medicationId,
      drugEntry.mohRegistration,
      drugEntry.dcaRegistration,
      drugEntry.manufacturer,
      drugEntry.availability,
      drugEntry.halalCertified,
      drugEntry.pricing ? JSON.stringify(drugEntry.pricing) : null
    ]);
  }

  private async insertMedicationImages(t: any, medicationId: string, images: string[]): Promise<void> {
    const query = `
      INSERT INTO medication_images (medication_id, image_url, uploaded_at)
      VALUES ($1, $2, $3)
    `;

    for (const imageUrl of images) {
      await t.none(query, [medicationId, imageUrl, new Date().toISOString()]);
    }
  }

  private extractMedicationNameFromOCR(ocrResult: OCRResult): string {
    return ocrResult.medicationName || ocrResult.extractedText.split('\n')[0] || 'Unknown Medication';
  }

  private extractDosageFromOCR(ocrResult: OCRResult): any {
    const dosageText = ocrResult.dosageInfo || ocrResult.extractedText;

    // Simple extraction - would be more sophisticated in production
    const amountMatch = dosageText.match(/(\d+)\s*(mg|ml|tablet)/i);

    return {
      amount: amountMatch ? parseInt(amountMatch[1]) : 1,
      unit: amountMatch ? amountMatch[2].toLowerCase() : 'tablet',
      form: 'tablet',
      instructions: ocrResult.instructions || 'Take as directed'
    };
  }

  private async findGenericName(medicationName: string): Promise<string | undefined> {
    const searchResult = await this.searchMalaysianDrugDatabase({
      query: medicationName,
      type: 'brand'
    });

    return searchResult.length > 0 ? searchResult[0].genericName : undefined;
  }

  private generateCulturalConsiderations(drugEntry: MedicationDatabaseEntry): string[] {
    const considerations: string[] = [];

    if (drugEntry.culturalInfo.takeWithFood) {
      considerations.push('Take with food for better absorption');
    }

    if (!drugEntry.culturalInfo.ramadanCompliant) {
      considerations.push('Consult healthcare provider for Ramadan adjustments');
    }

    if (!drugEntry.halalCertified) {
      considerations.push('Halal status not verified - check with pharmacist');
    }

    return considerations;
  }
}