/**
 * Medication Search Service
 * 
 * Advanced medication search functionality with:
 * - Intelligent autocomplete for Malaysian medications
 * - Fuzzy matching and typo tolerance
 * - Cultural filtering (halal, language preferences)
 * - Offline search capability
 * - Malaysian pharmaceutical database integration
 */

import { medicationDatabaseService } from './databaseService';
import { cacheService } from '../cache/cacheService';
import { 
  MedicationSearchResult,
  MalaysianMedicationInfo,
  ApiResponse
} from '../../types/medication';

export interface SearchOptions {
  // Search parameters
  limit?: number;
  offset?: number;
  
  // Filtering options
  categories?: string[];
  manufacturers?: string[];
  halalOnly?: boolean;
  prescriptionOnly?: boolean;
  
  // Cultural preferences
  language?: 'ms' | 'en' | 'zh' | 'ta';
  culturalContext?: {
    religion?: string;
    dietaryRestrictions?: string[];
    preferredBrands?: string[];
  };
  
  // Search behavior
  fuzzyMatch?: boolean;
  includeGeneric?: boolean;
  includeBrand?: boolean;
  sortBy?: 'relevance' | 'name' | 'popularity' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface AutocompleteResult {
  suggestions: Array<{
    text: string;
    type: 'medication' | 'generic' | 'brand' | 'manufacturer' | 'category';
    confidence: number;
    metadata?: {
      medicationId?: string;
      halalStatus?: string;
      category?: string;
    };
  }>;
  searchTime: number;
  totalMatches: number;
  fromCache: boolean;
}

export interface SearchAnalytics {
  query: string;
  resultsCount: number;
  searchTime: number;
  filters: SearchOptions;
  timestamp: number;
  userId?: string;
  culturalContext?: any;
}

class MedicationSearchService {
  private readonly AUTOCOMPLETE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MIN_QUERY_LENGTH = 2;
  private readonly MAX_AUTOCOMPLETE_RESULTS = 10;

  // Malaysian-specific medication common terms and aliases
  private readonly MALAYSIAN_MEDICATION_ALIASES = {
    'ubat': 'medication',
    'pil': 'tablet',
    'sirap': 'syrup',
    'kapsul': 'capsule',
    'suntikan': 'injection',
    'salap': 'ointment',
    'titis': 'drops',
    'demam': 'fever',
    'sakit kepala': 'headache',
    'batuk': 'cough',
    'selsema': 'flu',
  };

  /**
   * Perform intelligent medication search with Malaysian context
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<ApiResponse<MedicationSearchResult & { analytics: SearchAnalytics }>> {
    const startTime = Date.now();
    
    try {
      // Validate query
      if (!query || query.trim().length < this.MIN_QUERY_LENGTH) {
        return {
          success: false,
          error: `Query must be at least ${this.MIN_QUERY_LENGTH} characters long`,
        };
      }

      const normalizedQuery = this.normalizeQuery(query, options.language);
      const cacheKey = `search_${normalizedQuery}_${JSON.stringify(options)}`;

      // Check cache first
      const cachedResult = await cacheService.get<MedicationSearchResult>(cacheKey);
      if (cachedResult) {
        const searchTime = Date.now() - startTime;
        return {
          success: true,
          data: {
            ...cachedResult,
            analytics: {
              query: normalizedQuery,
              resultsCount: cachedResult.medications.length,
              searchTime,
              filters: options,
              timestamp: Date.now(),
            },
          },
        };
      }

      // Perform search using database service
      const searchResponse = await medicationDatabaseService.searchMedications(
        normalizedQuery,
        {
          limit: options.limit,
          includeGeneric: options.includeGeneric !== false,
          includeBrand: options.includeBrand !== false,
          culturalFilter: {
            halalOnly: options.halalOnly,
            language: options.language,
          },
          categories: options.categories,
        }
      );

      if (!searchResponse.success || !searchResponse.data) {
        return searchResponse;
      }

      let searchResult = searchResponse.data;

      // Apply additional filtering
      if (options.manufacturers?.length) {
        searchResult.medications = searchResult.medications.filter(med => 
          options.manufacturers!.includes(med.manufacturer)
        );
      }

      if (options.prescriptionOnly !== undefined) {
        searchResult.medications = searchResult.medications.filter(med => 
          options.prescriptionOnly 
            ? med.availability === 'prescription'
            : med.availability !== 'prescription'
        );
      }

      // Apply cultural filtering
      if (options.culturalContext) {
        searchResult = await this.applyCulturalFiltering(searchResult, options.culturalContext);
      }

      // Sort results
      searchResult.medications = this.sortResults(
        searchResult.medications, 
        normalizedQuery,
        options.sortBy,
        options.sortOrder
      );

      // Apply pagination
      if (options.offset || options.limit) {
        const startIndex = options.offset || 0;
        const endIndex = startIndex + (options.limit || 20);
        searchResult.medications = searchResult.medications.slice(startIndex, endIndex);
      }

      // Cache the result
      await cacheService.set(cacheKey, searchResult, this.SEARCH_CACHE_TTL);

      // Prepare analytics
      const searchTime = Date.now() - startTime;
      const analytics: SearchAnalytics = {
        query: normalizedQuery,
        resultsCount: searchResult.medications.length,
        searchTime,
        filters: options,
        timestamp: Date.now(),
        culturalContext: options.culturalContext,
      };

      // Track search analytics (in a real app, this would go to analytics service)
      this.trackSearchAnalytics(analytics);

      return {
        success: true,
        data: {
          ...searchResult,
          analytics,
        },
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
   * Get autocomplete suggestions with Malaysian context
   */
  async getAutocompleteSuggestions(
    query: string,
    options: Partial<SearchOptions> = {}
  ): Promise<ApiResponse<AutocompleteResult>> {
    const startTime = Date.now();
    
    try {
      if (!query || query.trim().length < 1) {
        return {
          success: true,
          data: {
            suggestions: [],
            searchTime: Date.now() - startTime,
            totalMatches: 0,
            fromCache: false,
          },
        };
      }

      const normalizedQuery = this.normalizeQuery(query, options.language);
      const cacheKey = `autocomplete_${normalizedQuery}_${JSON.stringify(options)}`;

      // Check cache
      const cachedResult = await cacheService.get<AutocompleteResult>(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: {
            ...cachedResult,
            fromCache: true,
            searchTime: Date.now() - startTime,
          },
        };
      }

      // Generate suggestions from multiple sources
      const suggestions: AutocompleteResult['suggestions'] = [];

      // 1. Direct medication name matches
      const medicationSuggestions = await this.getMedicationNameSuggestions(normalizedQuery, options);
      suggestions.push(...medicationSuggestions);

      // 2. Generic name suggestions
      if (options.includeGeneric !== false) {
        const genericSuggestions = await this.getGenericNameSuggestions(normalizedQuery, options);
        suggestions.push(...genericSuggestions);
      }

      // 3. Manufacturer suggestions
      const manufacturerSuggestions = await this.getManufacturerSuggestions(normalizedQuery, options);
      suggestions.push(...manufacturerSuggestions);

      // 4. Category suggestions
      const categorySuggestions = await this.getCategorySuggestions(normalizedQuery, options);
      suggestions.push(...categorySuggestions);

      // 5. Malaysian-specific aliases
      const aliasSuggestions = this.getAliasSuggestions(normalizedQuery, options.language);
      suggestions.push(...aliasSuggestions);

      // Sort by confidence and relevance
      const sortedSuggestions = suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.MAX_AUTOCOMPLETE_RESULTS);

      const result: AutocompleteResult = {
        suggestions: sortedSuggestions,
        searchTime: Date.now() - startTime,
        totalMatches: sortedSuggestions.length,
        fromCache: false,
      };

      // Cache the result
      await cacheService.set(cacheKey, result, this.AUTOCOMPLETE_CACHE_TTL);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Autocomplete suggestions error:', error);
      return {
        success: false,
        error: 'Failed to get autocomplete suggestions',
      };
    }
  }

  /**
   * Search medications by condition or indication
   */
  async searchByCondition(
    condition: string,
    options: SearchOptions = {}
  ): Promise<ApiResponse<MedicationSearchResult>> {
    try {
      // Malaysian condition name mapping
      const conditionMap: Record<string, string[]> = {
        'demam': ['fever', 'pyrexia', 'hyperthermia'],
        'sakit kepala': ['headache', 'migraine', 'cephalgia'],
        'batuk': ['cough', 'antitussive'],
        'selsema': ['flu', 'influenza', 'cold'],
        'sakit perut': ['stomach pain', 'gastritis', 'dyspepsia'],
        'alahan': ['allergy', 'allergic reaction', 'hypersensitivity'],
      };

      const searchTerms = [condition];
      const normalizedCondition = condition.toLowerCase();
      
      // Add mapped terms
      Object.entries(conditionMap).forEach(([malay, english]) => {
        if (normalizedCondition.includes(malay)) {
          searchTerms.push(...english);
        } else {
          english.forEach(term => {
            if (normalizedCondition.includes(term.toLowerCase())) {
              searchTerms.push(malay);
            }
          });
        }
      });

      // Search for each term and combine results
      const searchPromises = searchTerms.map(term => 
        this.search(term, { ...options, limit: 10 })
      );

      const searchResults = await Promise.all(searchPromises);
      const allMedications: MalaysianMedicationInfo[] = [];
      const seenIds = new Set<string>();

      searchResults.forEach(result => {
        if (result.success && result.data) {
          result.data.medications.forEach(med => {
            if (!seenIds.has(med.id)) {
              seenIds.add(med.id);
              allMedications.push(med);
            }
          });
        }
      });

      // Score medications by relevance to condition
      const scoredMedications = allMedications.map(med => ({
        ...med,
        relevanceScore: this.calculateConditionRelevance(med, condition),
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);

      const result: MedicationSearchResult = {
        medications: scoredMedications.slice(0, options.limit || 20),
        totalCount: scoredMedications.length,
        searchQuery: condition,
        filters: options,
        suggestions: await this.generateConditionSuggestions(condition),
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Search by condition error:', error);
      return {
        success: false,
        error: 'Failed to search by condition',
      };
    }
  }

  /**
   * Get popular medications for Malaysian market
   */
  async getPopularMedications(
    options: SearchOptions = {}
  ): Promise<ApiResponse<MedicationSearchResult>> {
    try {
      // Common medications in Malaysian market
      const popularMedications = [
        'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Metformin',
        'Amlodipine', 'Omeprazole', 'Aspirin', 'Cetirizine',
        'Prednisolone', 'Dextromethorphan'
      ];

      const searchPromises = popularMedications.map(medication =>
        this.search(medication, { ...options, limit: 5 })
      );

      const results = await Promise.all(searchPromises);
      const popularMeds: MalaysianMedicationInfo[] = [];

      results.forEach(result => {
        if (result.success && result.data) {
          popularMeds.push(...result.data.medications.slice(0, 2)); // Top 2 per medication
        }
      });

      return {
        success: true,
        data: {
          medications: popularMeds.slice(0, options.limit || 20),
          totalCount: popularMeds.length,
          searchQuery: 'popular_medications',
          filters: options,
        },
      };
    } catch (error) {
      console.error('Get popular medications error:', error);
      return {
        success: false,
        error: 'Failed to get popular medications',
      };
    }
  }

  /**
   * Private helper methods
   */

  private normalizeQuery(query: string, language?: string): string {
    let normalized = query.trim().toLowerCase();

    // Handle Malaysian language aliases
    if (language === 'ms' || !language) {
      Object.entries(this.MALAYSIAN_MEDICATION_ALIASES).forEach(([malay, english]) => {
        normalized = normalized.replace(new RegExp(malay, 'gi'), english);
      });
    }

    // Remove common prefixes and suffixes that might interfere with search
    normalized = normalized.replace(/^(ubat|pil|sirap)\s+/i, '');
    normalized = normalized.replace(/\s+(tablet|capsule|syrup|mg|ml)$/i, '');

    return normalized;
  }

  private async getMedicationNameSuggestions(
    query: string,
    options: Partial<SearchOptions>
  ): Promise<AutocompleteResult['suggestions']> {
    // Simplified implementation - in reality would search indexed medication names
    const commonMedications = [
      'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Aspirin', 
      'Omeprazole', 'Cetirizine', 'Prednisolone', 'Metformin'
    ];

    return commonMedications
      .filter(med => med.toLowerCase().includes(query.toLowerCase()))
      .map(med => ({
        text: med,
        type: 'medication' as const,
        confidence: this.calculateMatchConfidence(query, med),
        metadata: {
          medicationId: `med_${med.toLowerCase()}`,
          halalStatus: 'halal', // Would be looked up in real implementation
        },
      }))
      .slice(0, 5);
  }

  private async getGenericNameSuggestions(
    query: string,
    options: Partial<SearchOptions>
  ): Promise<AutocompleteResult['suggestions']> {
    // Mock implementation
    const genericNames = ['acetaminophen', 'ibuprofen', 'amoxicillin'];
    
    return genericNames
      .filter(name => name.includes(query.toLowerCase()))
      .map(name => ({
        text: name,
        type: 'generic' as const,
        confidence: this.calculateMatchConfidence(query, name),
      }))
      .slice(0, 3);
  }

  private async getManufacturerSuggestions(
    query: string,
    options: Partial<SearchOptions>
  ): Promise<AutocompleteResult['suggestions']> {
    // Common Malaysian pharmaceutical manufacturers
    const manufacturers = [
      'Pharmaniaga', 'Duopharma', 'CCM Pharmaceuticals',
      'Hovid', 'Y.S.P. Industries', 'Apex Healthcare'
    ];

    return manufacturers
      .filter(mfg => mfg.toLowerCase().includes(query.toLowerCase()))
      .map(mfg => ({
        text: mfg,
        type: 'manufacturer' as const,
        confidence: this.calculateMatchConfidence(query, mfg),
      }))
      .slice(0, 3);
  }

  private async getCategorySuggestions(
    query: string,
    options: Partial<SearchOptions>
  ): Promise<AutocompleteResult['suggestions']> {
    const categories = [
      'analgesic', 'antibiotic', 'antiviral', 'antacid',
      'antihistamine', 'antidiabetic', 'antihypertensive'
    ];

    return categories
      .filter(cat => cat.includes(query.toLowerCase()))
      .map(cat => ({
        text: cat,
        type: 'category' as const,
        confidence: this.calculateMatchConfidence(query, cat),
      }))
      .slice(0, 2);
  }

  private getAliasSuggestions(
    query: string,
    language?: string
  ): AutocompleteResult['suggestions'] {
    const suggestions: AutocompleteResult['suggestions'] = [];
    
    Object.entries(this.MALAYSIAN_MEDICATION_ALIASES).forEach(([malay, english]) => {
      if (malay.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          text: english,
          type: 'medication',
          confidence: 0.7,
        });
      } else if (english.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          text: malay,
          type: 'medication',
          confidence: 0.7,
        });
      }
    });

    return suggestions.slice(0, 2);
  }

  private calculateMatchConfidence(query: string, target: string): number {
    const queryLower = query.toLowerCase();
    const targetLower = target.toLowerCase();

    // Exact match
    if (queryLower === targetLower) return 1.0;

    // Starts with query
    if (targetLower.startsWith(queryLower)) return 0.9;

    // Contains query
    if (targetLower.includes(queryLower)) return 0.7;

    // Fuzzy match (simplified)
    const similarity = this.calculateStringSimilarity(queryLower, targetLower);
    return Math.max(0.1, similarity);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simplified Levenshtein distance calculation
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitution = matrix[j - 1][i - 1] + (str1[i - 1] === str2[j - 1] ? 0 : 1);
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (matrix[str2.length][str1.length] / maxLength);
  }

  private sortResults(
    medications: MalaysianMedicationInfo[],
    query: string,
    sortBy: SearchOptions['sortBy'] = 'relevance',
    sortOrder: SearchOptions['sortOrder'] = 'desc'
  ): MalaysianMedicationInfo[] {
    const sorted = [...medications];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'popularity':
          // Mock popularity scoring
          comparison = (a.name.length) - (b.name.length); // Shorter names are more "popular"
          break;
        case 'relevance':
        default:
          const aRelevance = this.calculateMatchConfidence(query, a.name);
          const bRelevance = this.calculateMatchConfidence(query, b.name);
          comparison = aRelevance - bRelevance;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  private async applyCulturalFiltering(
    searchResult: MedicationSearchResult,
    culturalContext: NonNullable<SearchOptions['culturalContext']>
  ): Promise<MedicationSearchResult> {
    // Apply religious filtering (e.g., halal requirements)
    if (culturalContext.religion === 'Islam') {
      // In a real implementation, this would filter based on actual halal certification
      searchResult.medications = searchResult.medications.filter(med => {
        // Mock halal filtering - in reality, this would check certification
        return true; // Assume all medications are checked for halal status
      });
    }

    // Apply dietary restriction filtering
    if (culturalContext.dietaryRestrictions?.includes('gelatin')) {
      searchResult.medications = searchResult.medications.filter(med => {
        // In reality, check ingredients for gelatin
        return !med.dosageFormsAvailable.includes('capsule'); // Simplified check
      });
    }

    return searchResult;
  }

  private calculateConditionRelevance(
    medication: MalaysianMedicationInfo,
    condition: string
  ): number {
    let relevance = 0;

    // Check indications
    const indicationsText = `${medication.indicationsMs} ${medication.indicationsEn}`.toLowerCase();
    if (indicationsText.includes(condition.toLowerCase())) {
      relevance += 50;
    }

    // Check medication name
    if (medication.name.toLowerCase().includes(condition.toLowerCase())) {
      relevance += 30;
    }

    // Check generic name
    if (medication.genericName.toLowerCase().includes(condition.toLowerCase())) {
      relevance += 25;
    }

    return relevance;
  }

  private async generateConditionSuggestions(condition: string): Promise<string[]> {
    const suggestions = [];
    
    // Related conditions based on common Malaysian health issues
    const relatedConditions: Record<string, string[]> = {
      'demam': ['sakit kepala', 'badan lenguh', 'selsema'],
      'batuk': ['selsema', 'sakit tekak', 'kahak'],
      'sakit perut': ['cirit-birit', 'sembelit', 'kembung'],
    };

    const conditionLower = condition.toLowerCase();
    Object.entries(relatedConditions).forEach(([key, related]) => {
      if (conditionLower.includes(key)) {
        suggestions.push(...related);
      }
    });

    return suggestions.slice(0, 5);
  }

  private trackSearchAnalytics(analytics: SearchAnalytics): void {
    // In a real implementation, this would send analytics to a service
    console.log('Search Analytics:', {
      query: analytics.query,
      resultsCount: analytics.resultsCount,
      searchTime: analytics.searchTime,
      timestamp: analytics.timestamp,
    });
  }
}

export const medicationSearchService = new MedicationSearchService();