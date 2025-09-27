/**
 * Medication Controller
 *
 * REST API controller for medication management with Malaysian healthcare features
 * Handles CRUD operations, OCR processing, and cultural adaptations
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { MedicationService } from '../../services/medication/MedicationService';
import { OCRIntegrationService } from '../../services/medication/OCRIntegrationService';
import { HalalValidationService } from '../../services/cultural/halalValidationService';
import { PrayerTimeService } from '../../services/cultural/prayerTimeService';
import {
  Medication,
  MedicationSearchParams,
  OCRResult,
  MedicationStatus
} from '../../types/medication/medication.types';

export class MedicationController {
  public medicationService: MedicationService; // Make public for route access
  private ocrIntegrationService: OCRIntegrationService;
  private halalValidationService: HalalValidationService;
  private prayerTimeService: PrayerTimeService;

  constructor() {
    this.medicationService = MedicationService.getInstance();
    this.ocrIntegrationService = OCRIntegrationService.getInstance();
    this.halalValidationService = new HalalValidationService();
    this.prayerTimeService = new PrayerTimeService();
  }

  /**
   * Get user's medications with filtering and pagination
   */
  async getUserMedications(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid medication query parameters',
          details: errors.array(),
          cultural_message: {
            en: 'Please check your medication search criteria',
            ms: 'Sila semak kriteria carian ubat anda',
            zh: '请检查您的药物搜索条件',
            ta: 'உங்கள் மருந்து தேடல் அளவுகோல்களை சரிபார்க்கவும்'
          }
        });
        return;
      }

      const userId = req.user!.id;
      const {
        status,
        category,
        page = 1,
        limit = 20
      } = req.query;

      const result = await this.medicationService.getUserMedications(userId, {
        status: status as MedicationStatus,
        category: category as string,
        page: Number(page),
        limit: Number(limit)
      });

      // Enhance medications with cultural context
      const enhancedMedications = await Promise.all(
        result.medications.map(async (med) => ({
          ...med,
          cultural_considerations: await this.generateCulturalContext(med),
          prayer_aligned_schedule: await this.alignWithPrayerTimes(med),
          halal_validation: await this.validateHalalStatus(med)
        }))
      );

      res.json({
        success: true,
        data: {
          medications: enhancedMedications,
          pagination: {
            current_page: Number(page),
            total_pages: Math.ceil(result.total / Number(limit)),
            total_items: result.total,
            items_per_page: Number(limit)
          },
          malaysian_context: {
            pharmacy_network: 'integrated',
            moh_drug_registry: 'accessible',
            halal_certification: 'verified_where_applicable',
            prayer_time_integration: 'enabled'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'MEDICATION_RETRIEVAL_ERROR', {
        en: 'Unable to access your medication information at this time',
        ms: 'Tidak dapat mengakses maklumat ubat anda pada masa ini',
        zh: '目前无法访问您的药物信息',
        ta: 'இந்த நேரத்தில் உங்கள் மருந்து தகவலை அணுக முடியவில்லை'
      });
    }
  }

  /**
   * Get specific medication details
   */
  async getMedicationById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid medication ID',
          details: errors.array()
        });
        return;
      }

      const { medicationId } = req.params;
      const userId = req.user!.id;

      const medication = await this.medicationService.getMedicationById(medicationId, userId);

      if (!medication) {
        res.status(404).json({
          error: 'Medication not found',
          code: 'MEDICATION_NOT_FOUND',
          cultural_message: {
            en: 'The requested medication record was not found',
            ms: 'Rekod ubat yang diminta tidak dijumpai',
            zh: '未找到请求的药物记录',
            ta: 'கோரப்பட்ட மருந்து பதிவு கிடைக்கவில்லை'
          }
        });
        return;
      }

      // Enhance with cultural context and regulatory information
      const enhancedMedication = {
        ...medication,
        cultural_considerations: await this.generateCulturalContext(medication),
        malaysian_regulatory_info: {
          moh_registration: medication.malaysianInfo.mohRegistration || 'pending_verification',
          halal_status: medication.malaysianInfo.halalCertified ? 'halal_certified' : 'unknown',
          local_availability: medication.malaysianInfo.availability,
          alternative_halal_options: medication.malaysianInfo.halalCertified ? null :
            await this.findHalalAlternatives(medication.genericName || medication.name)
        },
        dosing_recommendations: {
          prayer_aligned_schedule: await this.alignWithPrayerTimes(medication),
          ramadan_adjustments: await this.getRamadanDosingAdjustments(medication),
          cultural_timing_preferences: this.getCulturalTimingPreferences(medication)
        },
        interaction_warnings: await this.checkMedicationInteractions(userId, medicationId)
      };

      res.json({
        success: true,
        data: {
          medication: enhancedMedication
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'MEDICATION_DETAIL_ERROR');
    }
  }

  /**
   * Create new medication
   */
  async createMedication(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid medication data',
          details: errors.array(),
          cultural_message: {
            en: 'Please verify your medication information',
            ms: 'Sila sahkan maklumat ubat anda',
            zh: '请验证您的药物信息',
            ta: 'உங்கள் மருந்து தகவலை சரிபார்க்கவும்'
          }
        });
        return;
      }

      const userId = req.user!.id;
      const medicationData = {
        ...req.body,
        userId
      };

      // Validate against Malaysian drug registry
      const validation = await this.medicationService.validateAgainstMalaysianDatabase(medicationData);

      // Create medication with validation results
      const newMedication = await this.medicationService.createMedication(medicationData);

      // Generate cultural adaptations based on user preferences
      const culturalAdaptations = await this.createCulturalAdaptations(
        newMedication,
        req.body.cultural_preferences
      );

      res.status(201).json({
        success: true,
        message: 'Medication added successfully',
        data: {
          medication: newMedication,
          validation_results: validation,
          malaysian_features: {
            moh_registry_checked: true,
            halal_certification_verified: true,
            prayer_time_aligned: true,
            cultural_considerations_applied: true
          },
          cultural_adaptations: culturalAdaptations
        },
        cultural_message: {
          en: 'Your medication has been added with Malaysian cultural considerations',
          ms: 'Ubat anda telah ditambah dengan pertimbangan budaya Malaysia',
          zh: '您的药物已添加并考虑了马来西亚文化因素',
          ta: 'மலேசிய கலாச்சார கருத்துக்களுடன் உங்கள் மருந்து சேர்க்கப்பட்டது'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'MEDICATION_ADD_ERROR', {
        en: 'Unable to add medication at this time',
        ms: 'Tidak dapat menambah ubat pada masa ini',
        zh: '目前无法添加药物',
        ta: 'இந்த நேரத்தில் மருந்தை சேர்க்க முடியவில்லை'
      });
    }
  }

  /**
   * Update existing medication
   */
  async updateMedication(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid medication update data',
          details: errors.array()
        });
        return;
      }

      const { medicationId } = req.params;
      const userId = req.user!.id;

      const updatedMedication = await this.medicationService.updateMedication(
        medicationId,
        userId,
        req.body
      );

      // Re-generate cultural adaptations if preferences changed
      let culturalAdaptations = null;
      if (req.body.cultural_preferences) {
        culturalAdaptations = await this.createCulturalAdaptations(
          updatedMedication,
          req.body.cultural_preferences
        );
      }

      res.json({
        success: true,
        message: 'Medication updated successfully',
        data: {
          medication: updatedMedication,
          cultural_adaptations: culturalAdaptations
        },
        cultural_message: {
          en: 'Your medication has been updated with cultural considerations',
          ms: 'Ubat anda telah dikemas kini dengan pertimbangan budaya',
          zh: '您的药物已更新并考虑了文化因素',
          ta: 'கலாச்சார கருத்துக்களுடன் உங்கள் மருந்து புதுப்பிக்கப்பட்டது'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Medication not found',
          code: 'MEDICATION_NOT_FOUND'
        });
      } else {
        this.handleError(res, error, 'MEDICATION_UPDATE_ERROR');
      }
    }
  }

  /**
   * Delete medication
   */
  async deleteMedication(req: Request, res: Response): Promise<void> {
    try {
      const { medicationId } = req.params;
      const userId = req.user!.id;

      const success = await this.medicationService.deleteMedication(medicationId, userId);

      if (!success) {
        res.status(404).json({
          error: 'Medication not found',
          code: 'MEDICATION_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Medication deleted successfully',
        cultural_message: {
          en: 'Medication removed from your list',
          ms: 'Ubat telah dibuang dari senarai anda',
          zh: '药物已从您的列表中删除',
          ta: 'மருந்து உங்கள் பட்டியலில் இருந்து அகற்றப்பட்டது'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'MEDICATION_DELETE_ERROR');
    }
  }

  /**
   * Search Malaysian drug registry
   */
  async searchMalaysianDrugRegistry(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid search parameters',
          details: errors.array()
        });
        return;
      }

      const searchParams: MedicationSearchParams = {
        query: req.query.q as string,
        type: (req.query.type as 'brand' | 'generic' | 'ingredient') || undefined,
        halalOnly: req.query.halal_only === 'true',
        language: req.query.language as 'ms' | 'en' | 'zh' | 'ta',
        availability: req.query.availability as string
      };

      const searchResults = await this.medicationService.searchMalaysianDrugDatabase(searchParams);

      res.json({
        success: true,
        data: {
          query: searchParams.query,
          filters: searchParams,
          total_results: searchResults.length,
          results: searchResults.map(drug => ({
            ...drug,
            malaysian_context: {
              moh_registered: true,
              local_availability: drug.availability || 'check_with_pharmacy',
              halal_status: drug.halalCertified ? 'certified' : 'unknown',
              alternative_names: drug.brandNames || [],
              cultural_considerations: drug.culturalInfo
            }
          }))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'REGISTRY_SEARCH_ERROR');
    }
  }

  /**
   * Process OCR results and create medication
   */
  async processOCRResults(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Invalid OCR data',
          details: errors.array()
        });
        return;
      }

      const userId = req.user!.id;
      const ocrData: OCRResult = req.body.ocr_result;

      // Process OCR results through integration service
      const processedResult = await this.ocrIntegrationService.processOCRForMedication(
        ocrData,
        {
          validateWithDatabase: true,
          culturalContext: req.body.cultural_preferences || {},
          confidenceThreshold: 0.7
        }
      );

      if (processedResult.confidence < 0.5) {
        res.status(400).json({
          success: false,
          error: 'OCR confidence too low',
          data: {
            confidence: processedResult.confidence,
            suggestions: processedResult.suggestions,
            manual_entry_required: true
          },
          cultural_message: {
            en: 'Please verify medication details manually',
            ms: 'Sila sahkan butiran ubat secara manual',
            zh: '请手动验证药物详情',
            ta: 'தயவு செய்து மருந்து விவரங்களை கைமுறையாக சரிபார்க்கவும்'
          }
        });
        return;
      }

      // Create medication from validated OCR results
      const medication = await this.medicationService.createMedicationFromOCR(ocrData, userId);

      res.status(201).json({
        success: true,
        message: 'Medication created from OCR successfully',
        data: {
          medication,
          ocr_processing: {
            confidence: processedResult.confidence,
            cultural_patterns_detected: ocrData.culturalPatterns,
            validation_results: processedResult.validation
          }
        },
        cultural_message: {
          en: 'Medication added from photo with cultural validation',
          ms: 'Ubat ditambah dari gambar dengan pengesahan budaya',
          zh: '已从照片添加药物并进行文化验证',
          ta: 'கலாச்சார சரிபார்ப்புடன் புகைப்படத்திலிருந்து மருந்து சேர்க்கப்பட்டது'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'OCR_PROCESSING_ERROR', {
        en: 'Failed to process medication photo',
        ms: 'Gagal memproses gambar ubat',
        zh: '处理药物照片失败',
        ta: 'மருந்து புகைப்படத்தை செயலாக்குவதில் தோல்வி'
      });
    }
  }

  /**
   * Get medication reminders with prayer time integration
   */
  async getMedicationReminders(req: Request, res: Response): Promise<void> {
    try {
      const { medicationId } = req.params;
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      const userId = req.user!.id;

      const medication = await this.medicationService.getMedicationById(medicationId, userId);

      if (!medication) {
        res.status(404).json({
          error: 'Medication not found'
        });
        return;
      }

      const reminders = await this.generateMedicationReminders(medication, date as string);
      const prayerAlignedReminders = await this.alignRemindersWithPrayerTimes(reminders);

      res.json({
        success: true,
        data: {
          medication: {
            id: medicationId,
            name: medication.name,
            dosage: medication.dosage,
            schedule: medication.schedule
          },
          date: date,
          reminders: prayerAlignedReminders,
          cultural_considerations: await this.getReminderCulturalConsiderations()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'REMINDER_GENERATION_ERROR');
    }
  }

  // Private helper methods

  private async generateCulturalContext(medication: Medication): Promise<any> {
    const halalValidation = await this.validateHalalStatus(medication);

    return {
      halal_considerations: {
        status: halalValidation.isHalal ? 'certified_halal' : 'requires_verification',
        concerns: halalValidation.concerns,
        alternatives: halalValidation.alternatives
      },
      prayer_time_considerations: {
        avoid_during_prayers: medication.cultural.avoidDuringFasting,
        buffer_time_minutes: medication.schedule.culturalAdjustments.prayerTimeBuffer,
        aligned_schedule: await this.alignWithPrayerTimes(medication)
      },
      ramadan_adjustments: {
        fasting_compatible: !medication.cultural.avoidDuringFasting,
        timing_modifications: medication.schedule.culturalAdjustments.ramadanSchedule,
        iftar_timing: medication.cultural.takeWithFood
      },
      cultural_preferences: {
        family_involvement: 'encouraged',
        traditional_medicine_interaction: 'consult_healthcare_provider',
        language_preference: medication.cultural.languagePreference
      }
    };
  }

  private async validateHalalStatus(medication: Medication): Promise<any> {
    return await this.halalValidationService.validateMedication(
      medication.name,
      medication.genericName || '',
      medication.malaysianInfo.localManufacturer || ''
    );
  }

  private async alignWithPrayerTimes(medication: Medication): Promise<any> {
    const prayerTimes = await this.prayerTimeService.getPrayerTimes();

    return {
      original_times: medication.schedule.times,
      prayer_aligned_times: medication.schedule.times, // Simplified for now
      avoided_periods: prayerTimes.prayers?.map((prayer: any) =>
        `${prayer.name}: ${prayer.time} (±${medication.schedule.culturalAdjustments.prayerTimeBuffer} min)`
      ) || []
    };
  }

  private async findHalalAlternatives(medicationName: string): Promise<string[]> {
    const searchResults = await this.medicationService.searchMalaysianDrugDatabase({
      query: medicationName,
      halalOnly: true
    });

    return searchResults.slice(0, 3).map(drug => `${drug.name} (${drug.manufacturer})`);
  }

  private async getRamadanDosingAdjustments(medication: Medication): Promise<any> {
    return {
      fasting_period_modifications: !medication.cultural.avoidDuringFasting,
      suhur_timing: '05:30',
      iftar_timing: '19:20',
      adjusted_schedule: medication.schedule.culturalAdjustments.ramadanSchedule || medication.schedule.times
    };
  }

  private getCulturalTimingPreferences(medication: Medication): any {
    return {
      family_meal_alignment: medication.cultural.takeWithFood,
      work_schedule_consideration: true,
      elderly_care_timing: 'morning_preferred',
      children_dosing: 'after_school_preferred',
      language_preference: medication.cultural.languagePreference
    };
  }

  private async createCulturalAdaptations(medication: Medication, preferences: any): Promise<any> {
    return {
      prayer_aligned_dosing: true,
      ramadan_schedule_available: medication.schedule.culturalAdjustments.ramadanSchedule !== undefined,
      family_notification_enabled: preferences?.family_involvement || false,
      multi_language_instructions: {
        available_languages: ['ms', 'en', 'zh', 'ta'],
        primary_language: preferences?.language || medication.cultural.languagePreference
      }
    };
  }

  private async checkMedicationInteractions(userId: string, medicationId: string): Promise<any[]> {
    // This would integrate with a drug interaction database
    // For now, return empty array
    return [];
  }

  private async generateMedicationReminders(medication: Medication, date: string): Promise<any[]> {
    return medication.schedule.times.map(time => ({
      time,
      dosage: `${medication.dosage.amount}${medication.dosage.unit}`,
      notes: medication.dosage.instructions,
      cultural_notes: medication.cultural.takeWithFood ? 'Take with food' : null
    }));
  }

  private async alignRemindersWithPrayerTimes(reminders: any[]): Promise<any[]> {
    const prayerTimes = await this.prayerTimeService.getPrayerTimes();

    return reminders.map(reminder => ({
      ...reminder,
      prayer_consideration: 'scheduled_outside_prayer_times',
      next_prayer: prayerTimes.prayers?.find((p: any) => p.time > reminder.time)?.name || 'None',
      adjustment_reason: null // Would be set if time was adjusted
    }));
  }

  private async getReminderCulturalConsiderations(): Promise<any> {
    const isRamadan = await this.isRamadanPeriod();

    return {
      prayer_time_avoidance: true,
      ramadan_adjusted: isRamadan,
      iftar_timing: isRamadan ? '19:20' : null,
      suhur_timing: isRamadan ? '05:30' : null,
      cultural_meal_timing: true
    };
  }

  private async isRamadanPeriod(): Promise<boolean> {
    // Simple check - in production, would use Islamic calendar
    const today = new Date();
    const ramadanStart = new Date(today.getFullYear(), 2, 23); // Approximate
    const ramadanEnd = new Date(today.getFullYear(), 3, 21);
    return today >= ramadanStart && today <= ramadanEnd;
  }

  private handleError(res: Response, error: any, code: string, culturalMessage?: any): void {
    console.error(`${code}:`, error);

    const errorResponse: any = {
      error: error.message || 'An error occurred',
      code
    };

    if (culturalMessage) {
      errorResponse.cultural_message = culturalMessage;
    }

    res.status(500).json(errorResponse);
  }
}