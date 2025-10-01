/**
 * Medication Database Integration Service
 * 
 * Provides comprehensive medication database integration with:
 * - Malaysian pharmaceutical database access
 * - Advanced search and autocomplete functionality
 * - Generic and brand name mapping for Malaysian market
 * - Offline caching with 7-day capability
 * - Cultural medication preferences integration
 */

import { medicationService } from '../../api/services/medicationService';
import { culturalService } from '../../api/services/culturalService';
import { cacheService } from '../cache/cacheService';
import { 
  MalaysianMedicationInfo, 
  MedicationSearchResult, 
  MedicationSearchFilters,
  HalalValidationResponse,
  ApiResponse
} from '../../types/medication';

export interface MedicationAutocompleteOptions {
  limit?: number;
  includeGeneric?: boolean;
  includeBrand?: boolean;
  culturalFilter?: {
    halalOnly?: boolean;
    language?: 'ms' | 'en' | 'zh' | 'ta';
  };
  categories?: string[];
}

export interface MedicationDetailsOptions {
  includeDosages?: boolean;
  includeInteractions?: boolean;
  includeSideEffects?: boolean;
  includeContraindications?: boolean;
  includeCulturalInfo?: boolean;
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

export interface DrugInteractionCheck {
  medicationIds: string[];
  patientId?: string;
  includeSupplements?: boolean;
  includeCulturalConsiderations?: boolean;
}

export interface OfflineSyncStatus {
  lastSyncDate: Date;
  medicationsCount: number;
  searchIndexSize: number;
  cacheUsage: number; // MB
  syncInProgress: boolean;
  nextScheduledSync: Date;
}

class MedicationDatabaseService {
  private readonly CACHE_PREFIX = 'medication_db_';
  private readonly SEARCH_CACHE_PREFIX = 'medication_search_';
  private readonly OFFLINE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly SEARCH_CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour

  /**
   * Search medications with advanced filtering and autocomplete
   */
  async searchMedications(
    query: string, 
    options: MedicationAutocompleteOptions = {}
  ): Promise<ApiResponse<MedicationSearchResult>> {
    try {
      const cacheKey = `${this.SEARCH_CACHE_PREFIX}${query}_${JSON.stringify(options)}`;
      
      // Check cache first for quick results
      const cachedResult = await cacheService.get<MedicationSearchResult>(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
        };
      }

      // Build search parameters
      const searchParams = {
        search: query,
        halal_only: options.culturalFilter?.halalOnly,
        limit: options.limit || 20,
      };

      // Perform search via existing API service
      const response = await medicationService.searchMedications(query, {
        halalOnly: options.culturalFilter?.halalOnly,
        language: options.culturalFilter?.language,
      });

      if (!response.success || !response.data) {
        return response;
      }

      // Enhance results with autocomplete data
      const enhancedResults: MedicationSearchResult = {
        medications: response.data.medications,
        totalCount: response.data.medications.length,
        searchQuery: query,
        filters: {
          category: searchParams.halal_only ? 'halal_certified' : undefined,
        },
        suggestions: await this.generateSearchSuggestions(query, options),
      };

      // Cache results
      await cacheService.set(cacheKey, enhancedResults, this.SEARCH_CACHE_TTL);

      return {
        success: true,
        data: enhancedResults,
      };
    } catch (error) {
      console.error('Medication search error:', error);
      return {
        success: false,
        error: 'Failed to search medications',
      };
    }
  }

  /**
   * Get detailed medication information by ID
   */
  async getMedicationDetails(
    medicationId: string,
    options: MedicationDetailsOptions = {}
  ): Promise<ApiResponse<MalaysianMedicationInfo & { 
    interactions?: any[]; 
    culturalInfo?: any;
    dosageRecommendations?: any[];
  }>> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}details_${medicationId}`;
      
      // Check offline cache first
      const cachedDetails = await cacheService.get(cacheKey);
      if (cachedDetails && options.includeDosages !== true) {
        return {
          success: true,
          data: cachedDetails,
        };
      }

      // Get basic medication info
      const medicationResponse = await medicationService.getMedicationById(medicationId);
      if (!medicationResponse.success || !medicationResponse.data) {
        return medicationResponse;
      }

      const medication = medicationResponse.data;
      let enhancedDetails: any = {
        id: medication.medication_id,
        name: medication.name,
        genericName: medication.generic_name,
        brandNames: [medication.name], // In real implementation, fetch from database
        manufacturer: medication.manufacturer,
        registrationNumber: `MOH-${medicationId}`, // Would be real MOH registration
        dosageFormsAvailable: [medication.dosage_form],
        strengthsAvailable: [medication.strength],
        indicationsMs: medication.prescribing_info.indications.join(', '),
        indicationsEn: medication.prescribing_info.indications.join(', '),
        contraindications: medication.prescribing_info.contraindications,
        sideEffects: medication.prescribing_info.side_effects,
        interactions: [],
        storageInstructions: 'Store in cool, dry place',
        availability: medication.category === 'prescription' ? 'prescription' : 'otc',
      };

      // Get drug interactions if requested
      if (options.includeInteractions) {
        const interactionResponse = await medicationService.checkMedicationInteractions([medicationId]);
        if (interactionResponse.success && interactionResponse.data) {
          enhancedDetails.interactions = interactionResponse.data.interactions;
        }
      }

      // Get cultural information if requested
      if (options.includeCulturalInfo) {
        const culturalInfo = await this.getCulturalMedicationInfo(medicationId, medication.name);
        if (culturalInfo.success) {
          enhancedDetails.culturalInfo = culturalInfo.data;
        }
      }

      // Get dosage recommendations if requested
      if (options.includeDosages) {
        const dosageRecommendations = await this.getDosageRecommendations(medicationId);
        if (dosageRecommendations.success) {
          enhancedDetails.dosageRecommendations = dosageRecommendations.data;
        }
      }

      // Cache for offline use
      await cacheService.set(cacheKey, enhancedDetails, this.OFFLINE_CACHE_TTL);

      return {
        success: true,
        data: enhancedDetails,
      };
    } catch (error) {
      console.error('Get medication details error:', error);
      return {
        success: false,
        error: 'Failed to get medication details',
      };
    }
  }

  /**
   * Map between generic and brand names for Malaysian market
   */
  async mapMedicationNames(
    medicationName: string,
    mapToType: 'generic' | 'brand'
  ): Promise<ApiResponse<{
    original: string;
    mappedNames: string[];
    type: 'generic' | 'brand';
    confidence: number;
    malaysianContext: {
      commonBrands?: string[];
      localManufacturers?: string[];
      mohRegistered?: boolean;
    };
  }>> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}mapping_${medicationName}_${mapToType}`;
      
      // Check cache first
      const cachedMapping = await cacheService.get(cacheKey);
      if (cachedMapping) {
        return {
          success: true,
          data: cachedMapping,
        };
      }

      // Search for medication to get mapping information
      const searchResponse = await this.searchMedications(medicationName, {
        limit: 50,
        includeGeneric: true,
        includeBrand: true,
      });

      if (!searchResponse.success || !searchResponse.data) {
        return {
          success: false,
          error: 'Failed to find medication for mapping',
        };
      }

      const medications = searchResponse.data.medications;
      const mappedNames: string[] = [];
      const malaysianContext: any = {
        commonBrands: [],
        localManufacturers: [],
        mohRegistered: true,
      };

      // Extract mapping based on request type
      medications.forEach(med => {
        if (mapToType === 'generic' && med.generic_name) {
          if (!mappedNames.includes(med.generic_name)) {
            mappedNames.push(med.generic_name);
          }
        } else if (mapToType === 'brand' && med.name !== med.generic_name) {
          if (!mappedNames.includes(med.name)) {
            mappedNames.push(med.name);
            malaysianContext.commonBrands.push(med.name);
          }
        }
        
        if (!malaysianContext.localManufacturers.includes(med.manufacturer)) {
          malaysianContext.localManufacturers.push(med.manufacturer);
        }
      });

      const result = {
        original: medicationName,
        mappedNames,
        type: mapToType,
        confidence: mappedNames.length > 0 ? 0.85 : 0.3,
        malaysianContext,
      };

      // Cache the mapping
      await cacheService.set(cacheKey, result, this.OFFLINE_CACHE_TTL);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Medication name mapping error:', error);
      return {
        success: false,
        error: 'Failed to map medication names',
      };
    }
  }

  /**
   * Check drug interactions with comprehensive analysis
   */
  async checkDrugInteractions(
    check: DrugInteractionCheck
  ): Promise<ApiResponse<{
    hasInteractions: boolean;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    interactions: Array<{
      medication1: string;
      medication2: string;
      severity: 'mild' | 'moderate' | 'severe';
      description: string;
      clinicalSignificance: string;
      managementStrategy: string;
      culturalConsiderations?: string[];
    }>;
    recommendations: string[];
    culturalGuidelines?: string[];
  }>> {
    try {
      if (check.medicationIds.length < 2) {
        return {
          success: true,
          data: {
            hasInteractions: false,
            severity: 'low',
            interactions: [],
            recommendations: ['Single medication - no interactions to check'],
          },
        };
      }

      // Use existing API service for basic interaction checking
      const interactionResponse = await medicationService.checkMedicationInteractions(check.medicationIds);
      
      if (!interactionResponse.success) {
        return interactionResponse;
      }

      const basicInteractions = interactionResponse.data!.interactions;
      let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      const recommendations = [...interactionResponse.data!.recommendations];
      const culturalGuidelines: string[] = [];

      // Enhance interactions with detailed analysis
      const enhancedInteractions = await Promise.all(
        basicInteractions.map(async (interaction) => {
          // Get detailed medication info for both medications
          const med1Details = await this.getMedicationDetails(interaction.medication_1);
          const med2Details = await this.getMedicationDetails(interaction.medication_2);

          // Determine overall severity
          if (interaction.severity === 'severe') {
            severity = severity === 'critical' ? 'critical' : 'high';
          } else if (interaction.severity === 'moderate' && severity === 'low') {
            severity = 'moderate';
          }

          const enhancedInteraction = {
            medication1: med1Details.success ? med1Details.data!.name : interaction.medication_1,
            medication2: med2Details.success ? med2Details.data!.name : interaction.medication_2,
            severity: interaction.severity,
            description: interaction.description,
            clinicalSignificance: this.assessClinicalSignificance(interaction.severity),
            managementStrategy: this.generateManagementStrategy(interaction.severity),
            culturalConsiderations: await this.getCulturalInteractionConsiderations(
              interaction.medication_1,
              interaction.medication_2
            ),
          };

          return enhancedInteraction;
        })
      );

      // Add cultural guidelines if requested
      if (check.includeCulturalConsiderations) {
        culturalGuidelines.push(
          'Monitor during prayer times if medications affect concentration',
          'Consider Ramadan fasting periods for medication timing',
          'Ensure all medications are halal-certified if required'
        );
      }

      // Add additional recommendations based on severity
      if (severity === 'high' || severity === 'critical') {
        recommendations.push('Consult healthcare provider immediately');
        recommendations.push('Monitor patient closely for adverse effects');
      }

      return {
        success: true,
        data: {
          hasInteractions: enhancedInteractions.length > 0,
          severity,
          interactions: enhancedInteractions,
          recommendations,
          culturalGuidelines: culturalGuidelines.length > 0 ? culturalGuidelines : undefined,
        },
      };
    } catch (error) {
      console.error('Drug interaction check error:', error);
      return {
        success: false,
        error: 'Failed to check drug interactions',
      };
    }
  }

  /**
   * Sync medication database for offline use
   */
  async syncOfflineDatabase(
    options: {
      categories?: string[];
      halalOnly?: boolean;
      forceRefresh?: boolean;
      syncCallback?: (progress: number) => void;
    } = {}
  ): Promise<ApiResponse<OfflineSyncStatus>> {
    try {
      const syncStatusKey = `${this.CACHE_PREFIX}sync_status`;
      let syncStatus = await cacheService.get<OfflineSyncStatus>(syncStatusKey) || {
        lastSyncDate: new Date(0),
        medicationsCount: 0,
        searchIndexSize: 0,
        cacheUsage: 0,
        syncInProgress: false,
        nextScheduledSync: new Date(Date.now() + this.OFFLINE_CACHE_TTL),
      };

      // Check if sync is already in progress
      if (syncStatus.syncInProgress && !options.forceRefresh) {
        return {
          success: true,
          data: syncStatus,
        };
      }

      // Check if recent sync exists and force refresh is not requested
      const now = new Date();
      const timeSinceLastSync = now.getTime() - syncStatus.lastSyncDate.getTime();
      if (timeSinceLastSync < this.OFFLINE_CACHE_TTL && !options.forceRefresh) {
        return {
          success: true,
          data: syncStatus,
        };
      }

      // Start sync process
      syncStatus.syncInProgress = true;
      await cacheService.set(syncStatusKey, syncStatus, this.OFFLINE_CACHE_TTL);

      options.syncCallback?.(0);

      try {
        // Fetch medications in batches
        const batchSize = 100;
        let totalMedications = 0;
        let syncedCount = 0;

        // Get total count first
        const initialResponse = await medicationService.getMedications({
          halal_only: options.halalOnly,
          limit: 1,
        });

        if (!initialResponse.success) {
          throw new Error('Failed to get initial medication count');
        }

        // Fetch all medications in batches
        const allMedications: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await medicationService.getMedications({
            halal_only: options.halalOnly,
            page,
            limit: batchSize,
          });

          if (!response.success || !response.data) {
            break;
          }

          const medications = response.data.medications;
          allMedications.push(...medications);
          syncedCount += medications.length;

          // Update progress
          const progress = Math.min((syncedCount / (syncedCount + batchSize)) * 100, 90);
          options.syncCallback?.(progress);

          // Check if we have more pages
          hasMore = medications.length === batchSize;
          page++;
        }

        // Cache individual medications for offline access
        for (const medication of allMedications) {
          const detailsCacheKey = `${this.CACHE_PREFIX}details_${medication.medication_id}`;
          await cacheService.set(detailsCacheKey, medication, this.OFFLINE_CACHE_TTL);
        }

        // Build search index for offline use
        const searchIndex = this.buildSearchIndex(allMedications);
        await cacheService.set(`${this.CACHE_PREFIX}search_index`, searchIndex, this.OFFLINE_CACHE_TTL);

        // Update sync status
        syncStatus = {
          lastSyncDate: now,
          medicationsCount: allMedications.length,
          searchIndexSize: JSON.stringify(searchIndex).length,
          cacheUsage: await this.calculateCacheUsage(),
          syncInProgress: false,
          nextScheduledSync: new Date(now.getTime() + this.OFFLINE_CACHE_TTL),
        };

        await cacheService.set(syncStatusKey, syncStatus, this.OFFLINE_CACHE_TTL);
        options.syncCallback?.(100);

        return {
          success: true,
          data: syncStatus,
        };
      } finally {
        // Ensure sync flag is reset even if error occurs
        syncStatus.syncInProgress = false;
        await cacheService.set(syncStatusKey, syncStatus, this.OFFLINE_CACHE_TTL);
      }
    } catch (error) {
      console.error('Offline sync error:', error);
      return {
        success: false,
        error: 'Failed to sync medication database',
      };
    }
  }

  /**
   * Get offline sync status
   */
  async getOfflineSyncStatus(): Promise<ApiResponse<OfflineSyncStatus>> {
    try {
      const syncStatusKey = `${this.CACHE_PREFIX}sync_status`;
      const syncStatus = await cacheService.get<OfflineSyncStatus>(syncStatusKey);
      
      if (!syncStatus) {
        return {
          success: true,
          data: {
            lastSyncDate: new Date(0),
            medicationsCount: 0,
            searchIndexSize: 0,
            cacheUsage: 0,
            syncInProgress: false,
            nextScheduledSync: new Date(),
          },
        };
      }

      return {
        success: true,
        data: syncStatus,
      };
    } catch (error) {
      console.error('Get sync status error:', error);
      return {
        success: false,
        error: 'Failed to get sync status',
      };
    }
  }

  /**
   * Private helper methods
   */
  
  private async generateSearchSuggestions(
    query: string, 
    options: MedicationAutocompleteOptions
  ): Promise<string[]> {
    // In a real implementation, this would use ML/NLP for smart suggestions
    const suggestions: string[] = [];
    
    // Basic fuzzy matching suggestions
    if (query.length >= 2) {
      const commonMedicationPrefixes = [
        'Para', 'Amoxi', 'Ibu', 'Metro', 'Cepha', 'Diclo', 'Pred', 'Omet'
      ];
      
      commonMedicationPrefixes.forEach(prefix => {
        if (prefix.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push(`${prefix}cillin`, `${prefix}zole`, `${prefix}profen`);
        }
      });
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private async getCulturalMedicationInfo(medicationId: string, medicationName: string): Promise<ApiResponse<any>> {
    try {
      // Check halal status
      const halalResponse = await medicationService.validateMedicationHalal(medicationName);
      
      if (!halalResponse.success) {
        return halalResponse;
      }

      const culturalInfo = {
        halalStatus: halalResponse.data?.status,
        certification: halalResponse.data?.certification,
        alternatives: halalResponse.data?.alternatives,
        prayerTimeConsiderations: [],
        ramadanGuidance: 'Consult healthcare provider for Ramadan medication adjustments',
        culturalNotes: 'Standard medication - follow prescribed dosing schedule',
      };

      return {
        success: true,
        data: culturalInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get cultural medication info',
      };
    }
  }

  private async getDosageRecommendations(medicationId: string): Promise<ApiResponse<any[]>> {
    // In a real implementation, this would fetch from a dosage database
    return {
      success: true,
      data: [
        {
          indication: 'General use',
          adultDose: 'Follow prescription',
          pediatricDose: 'Consult pediatrician',
          elderlySose: 'May require dose adjustment',
          culturalConsiderations: 'Adjust timing for prayer schedule if needed',
        },
      ],
    };
  }

  private assessClinicalSignificance(severity: string): string {
    switch (severity) {
      case 'severe':
        return 'High clinical significance - may cause serious adverse effects';
      case 'moderate':
        return 'Moderate clinical significance - monitor patient closely';
      case 'mild':
      default:
        return 'Low clinical significance - minimal risk';
    }
  }

  private generateManagementStrategy(severity: string): string {
    switch (severity) {
      case 'severe':
        return 'Avoid concurrent use - consider alternative medications';
      case 'moderate':
        return 'Use with caution - monitor for adverse effects and adjust dosing';
      case 'mild':
      default:
        return 'Generally safe - routine monitoring sufficient';
    }
  }

  private async getCulturalInteractionConsiderations(
    med1Id: string, 
    med2Id: string
  ): Promise<string[]> {
    // In a real implementation, check for cultural-specific interaction concerns
    return [
      'Monitor during prayer times if medications affect alertness',
      'Consider meal timing adjustments during Ramadan',
    ];
  }

  private buildSearchIndex(medications: any[]): Record<string, any> {
    const index: Record<string, any> = {};
    
    medications.forEach(med => {
      // Index by name, generic name, and manufacturer
      const searchTerms = [
        med.name?.toLowerCase(),
        med.generic_name?.toLowerCase(),
        med.manufacturer?.toLowerCase(),
        ...med.active_ingredients?.map((ing: string) => ing.toLowerCase()) || [],
      ].filter(Boolean);

      searchTerms.forEach(term => {
        if (!index[term]) {
          index[term] = [];
        }
        index[term].push({
          id: med.medication_id,
          name: med.name,
          generic_name: med.generic_name,
          relevance: this.calculateRelevance(term, med),
        });
      });
    });

    return index;
  }

  private calculateRelevance(searchTerm: string, medication: any): number {
    let relevance = 0;
    
    // Exact name match gets highest relevance
    if (medication.name?.toLowerCase() === searchTerm) {
      relevance += 100;
    } else if (medication.name?.toLowerCase().includes(searchTerm)) {
      relevance += 50;
    }
    
    // Generic name match
    if (medication.generic_name?.toLowerCase() === searchTerm) {
      relevance += 80;
    } else if (medication.generic_name?.toLowerCase().includes(searchTerm)) {
      relevance += 40;
    }
    
    return relevance;
  }

  private async calculateCacheUsage(): Promise<number> {
    // In a real implementation, calculate actual cache storage usage
    return 0; // Placeholder
  }
}

export const medicationDatabaseService = new MedicationDatabaseService();