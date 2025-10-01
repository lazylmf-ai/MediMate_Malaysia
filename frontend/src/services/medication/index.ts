/**
 * Medication Services Index
 * 
 * Main export file for all medication database integration services
 * providing a unified API for medication management functionality.
 */

// Core services
export { medicationDatabaseService } from './databaseService';
export { medicationSearchService } from './searchService';
export { drugInteractionService } from './interactionService';

// Cache service (shared utility)
export { cacheService } from '../cache/cacheService';

// Service types
export type {
  MedicationAutocompleteOptions,
  MedicationDetailsOptions,
  DrugInteractionCheck,
  OfflineSyncStatus,
} from './databaseService';

export type {
  SearchOptions,
  AutocompleteResult,
  SearchAnalytics,
} from './searchService';

export type {
  DrugInteraction,
  InteractionCheckRequest,
  InteractionCheckResult,
  FoodDrugInteraction,
  MonitoringPlan,
} from './interactionService';

/**
 * Unified Medication Services Interface
 * 
 * Provides a single interface for all medication database operations
 * with integrated caching, cultural preferences, and offline support.
 */
export class MedicationServices {
  /**
   * Initialize medication services with user preferences
   */
  static async initialize(userPreferences?: {
    halalOnly?: boolean;
    language?: 'ms' | 'en' | 'zh' | 'ta';
    religion?: string;
    observesPrayerTimes?: boolean;
    observesRamadan?: boolean;
  }) {
    // Pre-cache critical medication data
    if (userPreferences?.halalOnly) {
      await medicationDatabaseService.syncOfflineDatabase({
        halalOnly: true,
      });
    }

    // Pre-load popular medications for faster access
    await medicationSearchService.getPopularMedications({
      halalOnly: userPreferences?.halalOnly,
      language: userPreferences?.language,
      limit: 50,
    });

    console.log('Medication services initialized with user preferences:', userPreferences);
  }

  /**
   * Perform intelligent medication search with cultural context
   */
  static async searchMedications(
    query: string,
    options: {
      limit?: number;
      culturalPreferences?: {
        halalOnly?: boolean;
        language?: 'ms' | 'en' | 'zh' | 'ta';
        religion?: string;
      };
      includeAutocomplete?: boolean;
    } = {}
  ) {
    const searchOptions = {
      limit: options.limit || 20,
      halalOnly: options.culturalPreferences?.halalOnly,
      language: options.culturalPreferences?.language,
      culturalContext: options.culturalPreferences?.religion ? {
        religion: options.culturalPreferences.religion,
        dietaryRestrictions: options.culturalPreferences.halalOnly ? ['haram'] : [],
      } : undefined,
    };

    // Perform search
    const searchResponse = await medicationSearchService.search(query, searchOptions);
    
    let autocompleteResponse = null;
    if (options.includeAutocomplete && query.length >= 2) {
      autocompleteResponse = await medicationSearchService.getAutocompleteSuggestions(
        query,
        searchOptions
      );
    }

    return {
      search: searchResponse,
      autocomplete: autocompleteResponse,
    };
  }

  /**
   * Get comprehensive medication details with cultural information
   */
  static async getMedicationDetails(
    medicationId: string,
    options: {
      culturalPreferences?: {
        language?: 'ms' | 'en' | 'zh' | 'ta';
        religion?: string;
        observesPrayerTimes?: boolean;
        observesRamadan?: boolean;
      };
      includeInteractionCheck?: boolean;
      interactionMedications?: string[];
    } = {}
  ) {
    // Get detailed medication information
    const detailsResponse = await medicationDatabaseService.getMedicationDetails(medicationId, {
      includeDosages: true,
      includeInteractions: true,
      includeSideEffects: true,
      includeContraindications: true,
      includeCulturalInfo: true,
      language: options.culturalPreferences?.language,
    });

    let interactionResponse = null;
    if (options.includeInteractionCheck && options.interactionMedications?.length) {
      // Check interactions with other medications
      const medications = [
        { id: medicationId, name: '' },
        ...options.interactionMedications.map(id => ({ id, name: '' })),
      ];

      interactionResponse = await drugInteractionService.checkInteractions({
        medications,
        patientProfile: {
          culturalProfile: {
            religion: options.culturalPreferences?.religion || '',
            observesPrayerTimes: options.culturalPreferences?.observesPrayerTimes || false,
            observesRamadan: options.culturalPreferences?.observesRamadan || false,
            dietaryRestrictions: [],
          },
        },
        checkOptions: {
          includeFoodInteractions: true,
          includeSupplements: true,
          includeOTCMedications: true,
          includeCulturalConsiderations: true,
          severityThreshold: 'all',
        },
      });
    }

    return {
      details: detailsResponse,
      interactions: interactionResponse,
    };
  }

  /**
   * Comprehensive drug interaction analysis
   */
  static async checkDrugInteractions(
    medications: Array<{ id: string; name: string; dosage?: string }>,
    patientProfile?: {
      culturalPreferences?: {
        religion?: string;
        observesPrayerTimes?: boolean;
        observesRamadan?: boolean;
        halalOnly?: boolean;
      };
      medicalConditions?: string[];
      allergies?: string[];
    }
  ) {
    return await drugInteractionService.checkInteractions({
      medications,
      patientProfile: {
        culturalProfile: {
          religion: patientProfile?.culturalPreferences?.religion || '',
          observesPrayerTimes: patientProfile?.culturalPreferences?.observesPrayerTimes || false,
          observesRamadan: patientProfile?.culturalPreferences?.observesRamadan || false,
          dietaryRestrictions: patientProfile?.culturalPreferences?.halalOnly ? ['haram'] : [],
        },
        medicalConditions: patientProfile?.medicalConditions,
        allergies: patientProfile?.allergies,
      },
      checkOptions: {
        includeFoodInteractions: true,
        includeSupplements: true,
        includeOTCMedications: true,
        includeCulturalConsiderations: true,
        severityThreshold: 'all',
      },
    });
  }

  /**
   * Sync medication database for offline use
   */
  static async syncForOfflineUse(
    options: {
      culturalPreferences?: {
        halalOnly?: boolean;
        language?: 'ms' | 'en' | 'zh' | 'ta';
      };
      forceRefresh?: boolean;
      progressCallback?: (progress: number) => void;
    } = {}
  ) {
    return await medicationDatabaseService.syncOfflineDatabase({
      halalOnly: options.culturalPreferences?.halalOnly,
      forceRefresh: options.forceRefresh,
      syncCallback: options.progressCallback,
    });
  }

  /**
   * Get offline sync status
   */
  static async getOfflineStatus() {
    return await medicationDatabaseService.getOfflineSyncStatus();
  }

  /**
   * Map between generic and brand names for Malaysian market
   */
  static async mapMedicationNames(
    medicationName: string,
    mapToType: 'generic' | 'brand'
  ) {
    return await medicationDatabaseService.mapMedicationNames(medicationName, mapToType);
  }

  /**
   * Get popular medications for Malaysian market
   */
  static async getPopularMedications(
    options: {
      culturalPreferences?: {
        halalOnly?: boolean;
        language?: 'ms' | 'en' | 'zh' | 'ta';
      };
      limit?: number;
    } = {}
  ) {
    return await medicationSearchService.getPopularMedications({
      halalOnly: options.culturalPreferences?.halalOnly,
      language: options.culturalPreferences?.language,
      limit: options.limit || 20,
    });
  }

  /**
   * Search medications by medical condition
   */
  static async searchByCondition(
    condition: string,
    options: {
      culturalPreferences?: {
        halalOnly?: boolean;
        language?: 'ms' | 'en' | 'zh' | 'ta';
      };
      limit?: number;
    } = {}
  ) {
    return await medicationSearchService.searchByCondition(condition, {
      halalOnly: options.culturalPreferences?.halalOnly,
      language: options.culturalPreferences?.language,
      limit: options.limit || 20,
    });
  }

  /**
   * Get interaction alerts for specific medication combination
   */
  static async getInteractionAlert(
    medication1Id: string,
    medication2Id: string
  ) {
    return await drugInteractionService.getInteractionAlerts(medication1Id, medication2Id);
  }

  /**
   * Get real-time interaction monitoring plan
   */
  static async getInteractionMonitoring(
    patientId: string,
    activeMedications: string[]
  ) {
    return await drugInteractionService.getActiveInteractionMonitoring(patientId, activeMedications);
  }

  /**
   * Check food-drug interactions with Malaysian context
   */
  static async checkFoodInteractions(
    medications: Array<{ id: string; name: string; genericName: string }>
  ) {
    // Convert to MalaysianMedicationInfo format (simplified)
    const malayMedications = medications.map(med => ({
      id: med.id,
      name: med.name,
      genericName: med.genericName,
      brandNames: [med.name],
      manufacturer: '',
      registrationNumber: '',
      dosageFormsAvailable: [],
      strengthsAvailable: [],
      indicationsMs: '',
      indicationsEn: '',
      contraindications: [],
      sideEffects: [],
      interactions: [],
      storageInstructions: '',
      availability: 'otc' as const,
      activeIngredient: [med.genericName],
    }));

    return await drugInteractionService.checkFoodInteractions(malayMedications);
  }

  /**
   * Clear all cached medication data
   */
  static async clearCache() {
    await cacheService.clear();
    console.log('Medication cache cleared');
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    return await cacheService.getStats();
  }
}

// Default export for convenience
export default MedicationServices;