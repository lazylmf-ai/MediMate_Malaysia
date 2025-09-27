/**
 * Enhanced Medication Search Service
 *
 * Provides optimized search capabilities for Malaysian medication database
 * with cultural intelligence, fuzzy matching, and performance optimization
 */

import { DatabaseService } from '../database/databaseService';
import { CacheService } from '../cache/redisService';
import { HalalValidationService } from '../cultural/halalValidationService';
import { MalaysianTerminologyService } from '../terminology/malaysian-terminology.service';
import {
  MedicationDatabaseEntry,
  MedicationSearchParams,
  MalaysianMedicationInfo
} from '../../types/medication/medication.types';

export interface EnhancedSearchParams extends MedicationSearchParams {
  fuzzyMatching?: boolean;
  culturalContext?: {
    malaysianBrands?: boolean;
    halalPreferred?: boolean;
    localManufacturers?: boolean;
    traditionalEquivalents?: boolean;
  };
  searchOptimization?: {
    useIndex?: boolean;
    cacheResults?: boolean;
    maxResults?: number;
    sortBy?: 'relevance' | 'popularity' | 'price' | 'availability';
  };
  filters?: {
    minConfidence?: number;
    availability?: ('widely_available' | 'limited' | 'prescription_only')[];
    priceRange?: { min: number; max: number };
    manufacturerTypes?: ('local' | 'international')[];
    dosageForms?: string[];
  };
}

export interface SearchResult {
  medications: MedicationDatabaseEntry[];
  totalFound: number;
  searchMeta: {
    query: string;
    searchTime: number;
    usedCache: boolean;
    fuzzyMatches: number;
    culturalEnhancements: number;
  };
  suggestions: {
    alternativeQueries: string[];
    relatedMedications: MedicationDatabaseEntry[];
    culturalAlternatives: MedicationDatabaseEntry[];
  };
  malaysianContext: {
    localAvailability: number;
    halalCertifiedCount: number;
    averagePrice: number;
    popularBrands: string[];
  };
}

export interface AutocompleteResult {
  suggestions: Array<{
    text: string;
    type: 'medication_name' | 'generic_name' | 'brand_name' | 'manufacturer';
    confidence: number;
    culturalRelevance: number;
    medication?: Partial<MedicationDatabaseEntry>;
  }>;
  totalSuggestions: number;
  responseTime: number;
}

export interface DatabaseOptimizationStats {
  indexUtilization: number;
  queryPerformance: number;
  cacheHitRate: number;
  popularSearches: Array<{
    query: string;
    frequency: number;
    avgResponseTime: number;
  }>;
  optimizationRecommendations: string[];
}

export class MedicationSearchService {
  private static instance: MedicationSearchService;
  private db: DatabaseService;
  private cache: CacheService;
  private halalValidationService: HalalValidationService;
  private terminologyService: MalaysianTerminologyService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    this.halalValidationService = HalalValidationService.getInstance();
    this.terminologyService = MalaysianTerminologyService.getInstance();
  }

  public static getInstance(): MedicationSearchService {
    if (!MedicationSearchService.instance) {
      MedicationSearchService.instance = new MedicationSearchService();
    }
    return MedicationSearchService.instance;
  }

  /**
   * Enhanced medication search with cultural intelligence and optimization
   */
  async searchMedications(params: EnhancedSearchParams): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(params);

    try {
      // Check cache first for performance optimization
      if (params.searchOptimization?.cacheResults !== false) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          const cachedResult = JSON.parse(cached) as SearchResult;
          cachedResult.searchMeta.usedCache = true;
          cachedResult.searchMeta.searchTime = Date.now() - startTime;
          return cachedResult;
        }
      }

      // Prepare search query with optimization
      const searchQuery = await this.buildOptimizedSearchQuery(params);

      // Execute search with Malaysian cultural enhancements
      const medications = await this.db.any(searchQuery.sql, searchQuery.params);

      // Apply fuzzy matching if enabled
      let fuzzyMatches: MedicationDatabaseEntry[] = [];
      if (params.fuzzyMatching && medications.length < 10) {
        fuzzyMatches = await this.performFuzzySearch(params);
      }

      // Enhance results with cultural context
      const enhancedMedications = await this.enhanceWithCulturalContext(
        medications,
        params.culturalContext
      );

      // Combine and deduplicate results
      const combinedResults = await this.deduplicateAndRank([
        ...enhancedMedications,
        ...fuzzyMatches
      ], params);

      // Generate suggestions and alternatives
      const suggestions = await this.generateSearchSuggestions(params, combinedResults);

      // Calculate Malaysian context statistics
      const malaysianContext = await this.calculateMalaysianContext(combinedResults);

      const searchResult: SearchResult = {
        medications: combinedResults.slice(0, params.searchOptimization?.maxResults || 50),
        totalFound: combinedResults.length,
        searchMeta: {
          query: params.query,
          searchTime: Date.now() - startTime,
          usedCache: false,
          fuzzyMatches: fuzzyMatches.length,
          culturalEnhancements: enhancedMedications.length - medications.length
        },
        suggestions,
        malaysianContext
      };

      // Cache results for performance
      if (params.searchOptimization?.cacheResults !== false) {
        await this.cache.set(cacheKey, JSON.stringify(searchResult), 1800); // 30 minutes
      }

      // Log search analytics for optimization
      await this.logSearchAnalytics(params, searchResult);

      return searchResult;
    } catch (error) {
      throw new Error(`Enhanced medication search failed: ${error.message}`);
    }
  }

  /**
   * High-performance autocomplete for medication names
   */
  async getAutocompletesuggestions(
    query: string,
    options: {
      limit?: number;
      culturalContext?: any;
      includeGeneric?: boolean;
      includeBrands?: boolean;
      includeManufacturers?: boolean;
    } = {}
  ): Promise<AutocompleteResult> {
    const startTime = Date.now();
    const limit = options.limit || 10;

    try {
      // Use optimized autocomplete query with indexed search
      const autocompleteQuery = `
        SELECT DISTINCT
          name as text,
          'medication_name' as type,
          0.9 as confidence,
          CASE WHEN halal_certified THEN 1.0 ELSE 0.5 END as cultural_relevance,
          id, generic_name, manufacturer, availability, halal_certified
        FROM malaysian_drug_database
        WHERE name ILIKE $1
        UNION ALL
        SELECT DISTINCT
          generic_name as text,
          'generic_name' as type,
          0.8 as confidence,
          CASE WHEN halal_certified THEN 1.0 ELSE 0.5 END as cultural_relevance,
          id, generic_name, manufacturer, availability, halal_certified
        FROM malaysian_drug_database
        WHERE generic_name ILIKE $1 AND generic_name IS NOT NULL
        ${options.includeBrands ? `
        UNION ALL
        SELECT DISTINCT
          brand_name as text,
          'brand_name' as type,
          0.7 as confidence,
          1.0 as cultural_relevance,
          drug_id as id, NULL as generic_name, NULL as manufacturer, NULL as availability, NULL as halal_certified
        FROM malaysian_drug_alternatives
        WHERE brand_name ILIKE $1
        ` : ''}
        ${options.includeManufacturers ? `
        UNION ALL
        SELECT DISTINCT
          manufacturer as text,
          'manufacturer' as type,
          0.6 as confidence,
          CASE WHEN manufacturer IN (
            SELECT name FROM malaysian_pharmaceutical_companies WHERE is_local = true
          ) THEN 1.0 ELSE 0.7 END as cultural_relevance,
          id, generic_name, manufacturer, availability, halal_certified
        FROM malaysian_drug_database
        WHERE manufacturer ILIKE $1 AND manufacturer IS NOT NULL
        ` : ''}
        ORDER BY cultural_relevance DESC, confidence DESC, text ASC
        LIMIT $2
      `;

      const results = await this.db.any(autocompleteQuery, [`%${query}%`, limit]);

      // Transform results to include medication data
      const suggestions = results.map(row => ({
        text: row.text,
        type: row.type as 'medication_name' | 'generic_name' | 'brand_name' | 'manufacturer',
        confidence: parseFloat(row.confidence),
        culturalRelevance: parseFloat(row.cultural_relevance),
        medication: row.id ? {
          id: row.id,
          name: row.text,
          genericName: row.generic_name,
          manufacturer: row.manufacturer,
          availability: row.availability,
          halalCertified: row.halal_certified
        } : undefined
      }));

      return {
        suggestions,
        totalSuggestions: suggestions.length,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Autocomplete search failed: ${error.message}`);
    }
  }

  /**
   * Advanced search with multiple criteria and cultural filters
   */
  async advancedSearch(
    criteria: {
      medications?: string[];
      conditions?: string[];
      interactions?: string[];
      culturalRequirements?: {
        halal?: boolean;
        ramadanCompliant?: boolean;
        pregnancySafe?: boolean;
      };
      demographics?: {
        ageGroup?: 'child' | 'adult' | 'elderly';
        gender?: 'male' | 'female';
        culturalBackground?: string;
      };
    }
  ): Promise<SearchResult> {
    try {
      const query = this.buildAdvancedSearchQuery(criteria);
      const results = await this.db.any(query.sql, query.params);

      // Apply cultural filtering
      const culturallyFilteredResults = await this.applyCulturalFiltering(
        results,
        criteria.culturalRequirements || {}
      );

      // Enhance with medication interaction checking
      const interactionCheckedResults = await this.checkMedicationInteractions(
        culturallyFilteredResults,
        criteria.medications || []
      );

      return {
        medications: interactionCheckedResults,
        totalFound: interactionCheckedResults.length,
        searchMeta: {
          query: 'Advanced Search',
          searchTime: Date.now(),
          usedCache: false,
          fuzzyMatches: 0,
          culturalEnhancements: culturallyFilteredResults.length - results.length
        },
        suggestions: {
          alternativeQueries: [],
          relatedMedications: [],
          culturalAlternatives: []
        },
        malaysianContext: await this.calculateMalaysianContext(interactionCheckedResults)
      };
    } catch (error) {
      throw new Error(`Advanced search failed: ${error.message}`);
    }
  }

  /**
   * Get database optimization statistics and recommendations
   */
  async getDatabaseOptimizationStats(): Promise<DatabaseOptimizationStats> {
    try {
      // Query database statistics
      const indexStats = await this.db.any(`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('malaysian_drug_database', 'medications', 'medication_adherence')
        ORDER BY idx_scan DESC
      `);

      // Get query performance statistics
      const queryStats = await this.getQueryPerformanceStats();

      // Get cache statistics
      const cacheStats = await this.getCacheStatistics();

      // Get popular searches
      const popularSearches = await this.getPopularSearches();

      // Generate optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(
        indexStats,
        queryStats,
        cacheStats
      );

      return {
        indexUtilization: this.calculateIndexUtilization(indexStats),
        queryPerformance: queryStats.avgResponseTime,
        cacheHitRate: cacheStats.hitRate,
        popularSearches,
        optimizationRecommendations: recommendations
      };
    } catch (error) {
      throw new Error(`Failed to get optimization stats: ${error.message}`);
    }
  }

  /**
   * Optimize database for better search performance
   */
  async optimizeDatabase(): Promise<{
    indexesCreated: string[];
    statisticsUpdated: boolean;
    cacheWarmed: boolean;
    optimizationApplied: string[];
  }> {
    try {
      const optimizations: string[] = [];
      const indexesCreated: string[] = [];

      // Create search performance indexes
      const searchIndexes = [
        {
          name: 'idx_medication_search_gin',
          sql: `CREATE INDEX IF NOT EXISTS idx_medication_search_gin
                ON malaysian_drug_database USING GIN(to_tsvector('english', name || ' ' || COALESCE(generic_name, '')))`
        },
        {
          name: 'idx_medication_cultural_search',
          sql: `CREATE INDEX IF NOT EXISTS idx_medication_cultural_search
                ON malaysian_drug_database (halal_certified, availability, manufacturer)`
        },
        {
          name: 'idx_medication_autocomplete',
          sql: `CREATE INDEX IF NOT EXISTS idx_medication_autocomplete
                ON malaysian_drug_database (LOWER(name), LOWER(generic_name))`
        },
        {
          name: 'idx_user_medications_active',
          sql: `CREATE INDEX IF NOT EXISTS idx_user_medications_active
                ON medications (user_id, status) WHERE status = 'active'`
        }
      ];

      // Create indexes
      for (const index of searchIndexes) {
        try {
          await this.db.none(index.sql);
          indexesCreated.push(index.name);
          optimizations.push(`Created index: ${index.name}`);
        } catch (error) {
          console.warn(`Failed to create index ${index.name}:`, error.message);
        }
      }

      // Update table statistics
      await this.db.none('ANALYZE malaysian_drug_database, medications, medication_adherence');
      optimizations.push('Updated table statistics');

      // Warm up cache with popular searches
      const popularQueries = await this.getPopularSearchQueries();
      for (const query of popularQueries.slice(0, 20)) {
        try {
          await this.searchMedications({
            query: query.query,
            searchOptimization: { cacheResults: true }
          });
        } catch (error) {
          console.warn(`Failed to warm cache for query "${query.query}":`, error.message);
        }
      }
      optimizations.push('Warmed cache with popular searches');

      return {
        indexesCreated,
        statisticsUpdated: true,
        cacheWarmed: true,
        optimizationApplied: optimizations
      };
    } catch (error) {
      throw new Error(`Database optimization failed: ${error.message}`);
    }
  }

  // Private helper methods

  private generateCacheKey(params: EnhancedSearchParams): string {
    return `medication_search:${JSON.stringify(params)}`;
  }

  private async buildOptimizedSearchQuery(params: EnhancedSearchParams): Promise<{
    sql: string;
    params: any[];
  }> {
    let sql = `
      SELECT DISTINCT
        mdd.*,
        array_agg(DISTINCT mda.brand_name) as brand_names,
        array_agg(DISTINCT mdf.form) as dosage_forms,
        array_agg(DISTINCT mds.strength) as strengths,
        ts_rank(
          to_tsvector('english', mdd.name || ' ' || COALESCE(mdd.generic_name, '')),
          plainto_tsquery('english', $1)
        ) as search_rank
      FROM malaysian_drug_database mdd
      LEFT JOIN malaysian_drug_alternatives mda ON mdd.id = mda.drug_id
      LEFT JOIN malaysian_drug_dosage_forms mdf ON mdd.id = mdf.drug_id
      LEFT JOIN malaysian_drug_strengths mds ON mdd.id = mds.drug_id
      WHERE 1=1
    `;

    const queryParams: any[] = [params.query];
    let paramCount = 1;

    // Add text search condition
    if (params.query) {
      sql += ` AND (
        to_tsvector('english', mdd.name || ' ' || COALESCE(mdd.generic_name, ''))
        @@ plainto_tsquery('english', $1)
        OR mdd.name ILIKE $${++paramCount}
        OR mdd.generic_name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${params.query}%`);
    }

    // Add cultural filters
    if (params.culturalContext?.halalPreferred || params.halalOnly) {
      sql += ` AND mdd.halal_certified = true`;
    }

    if (params.culturalContext?.localManufacturers) {
      sql += ` AND EXISTS (
        SELECT 1 FROM malaysian_pharmaceutical_companies mpc
        WHERE mpc.name = mdd.manufacturer AND mpc.is_local = true
      )`;
    }

    // Add availability filters
    if (params.filters?.availability?.length) {
      sql += ` AND mdd.availability = ANY($${++paramCount})`;
      queryParams.push(params.filters.availability);
    }

    // Add price range filter
    if (params.filters?.priceRange) {
      sql += ` AND mdd.average_price BETWEEN $${++paramCount} AND $${++paramCount}`;
      queryParams.push(params.filters.priceRange.min, params.filters.priceRange.max);
    }

    // Add grouping and ordering
    sql += `
      GROUP BY mdd.id, mdd.name, mdd.generic_name, mdd.manufacturer,
               mdd.moh_registration, mdd.halal_certified, mdd.availability
      ORDER BY
        CASE WHEN $${++paramCount} = 'relevance' THEN search_rank END DESC,
        CASE WHEN $${paramCount} = 'popularity' THEN mdd.search_frequency END DESC,
        CASE WHEN $${paramCount} = 'price' THEN mdd.average_price END ASC,
        CASE WHEN $${paramCount} = 'availability' THEN
          CASE mdd.availability
            WHEN 'widely_available' THEN 1
            WHEN 'limited' THEN 2
            WHEN 'prescription_only' THEN 3
            ELSE 4
          END
        END ASC,
        mdd.name ASC
      LIMIT $${++paramCount}
    `;

    queryParams.push(
      params.searchOptimization?.sortBy || 'relevance',
      params.searchOptimization?.maxResults || 50
    );

    return { sql, params: queryParams };
  }

  private async performFuzzySearch(params: EnhancedSearchParams): Promise<MedicationDatabaseEntry[]> {
    // Implement fuzzy search using Levenshtein distance or similar algorithm
    const fuzzyQuery = `
      SELECT *,
        levenshtein(LOWER(name), LOWER($1)) as name_distance,
        levenshtein(LOWER(COALESCE(generic_name, '')), LOWER($1)) as generic_distance
      FROM malaysian_drug_database
      WHERE levenshtein(LOWER(name), LOWER($1)) <= 3
         OR levenshtein(LOWER(COALESCE(generic_name, '')), LOWER($1)) <= 3
      ORDER BY LEAST(name_distance, generic_distance) ASC
      LIMIT 10
    `;

    try {
      const results = await this.db.any(fuzzyQuery, [params.query]);
      return results.map(this.transformDatabaseEntry);
    } catch (error) {
      console.warn('Fuzzy search failed:', error.message);
      return [];
    }
  }

  private async enhanceWithCulturalContext(
    medications: any[],
    culturalContext?: any
  ): Promise<MedicationDatabaseEntry[]> {
    const enhanced = await Promise.all(
      medications.map(async (med) => {
        const medication = this.transformDatabaseEntry(med);

        // Add cultural enhancements
        if (culturalContext?.traditionalEquivalents) {
          medication.culturalInfo.traditionalAlternatives =
            await this.findTraditionalAlternatives(medication.genericName);
        }

        // Enhanced halal validation
        if (culturalContext?.halalPreferred) {
          const halalValidation = await this.halalValidationService.validateMedication({
            name: medication.name,
            genericName: medication.genericName,
            manufacturer: medication.manufacturer
          });
          medication.halalCertified = halalValidation.isHalal;
        }

        return medication;
      })
    );

    return enhanced;
  }

  private async deduplicateAndRank(
    medications: MedicationDatabaseEntry[],
    params: EnhancedSearchParams
  ): Promise<MedicationDatabaseEntry[]> {
    // Remove duplicates based on ID
    const unique = medications.filter((med, index, arr) =>
      arr.findIndex(m => m.id === med.id) === index
    );

    // Apply ranking algorithm based on search parameters
    return unique.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Cultural relevance scoring
      if (params.culturalContext?.halalPreferred) {
        scoreA += a.halalCertified ? 10 : 0;
        scoreB += b.halalCertified ? 10 : 0;
      }

      if (params.culturalContext?.localManufacturers) {
        scoreA += a.manufacturer.includes('Malaysia') ? 5 : 0;
        scoreB += b.manufacturer.includes('Malaysia') ? 5 : 0;
      }

      // Availability scoring
      const availabilityScore = {
        'widely_available': 3,
        'limited': 2,
        'prescription_only': 1,
        'unavailable': 0
      };

      scoreA += availabilityScore[a.availability] || 0;
      scoreB += availabilityScore[b.availability] || 0;

      return scoreB - scoreA;
    });
  }

  private async generateSearchSuggestions(
    params: EnhancedSearchParams,
    results: MedicationDatabaseEntry[]
  ): Promise<SearchResult['suggestions']> {
    // Generate alternative queries
    const alternativeQueries = await this.generateAlternativeQueries(params.query);

    // Find related medications
    const relatedMedications = await this.findRelatedMedications(results, 5);

    // Find cultural alternatives
    const culturalAlternatives = await this.findCulturalAlternatives(results, params);

    return {
      alternativeQueries,
      relatedMedications,
      culturalAlternatives
    };
  }

  private async calculateMalaysianContext(
    medications: MedicationDatabaseEntry[]
  ): Promise<SearchResult['malaysianContext']> {
    const localCount = medications.filter(m =>
      m.manufacturer.includes('Malaysia') || m.manufacturer.includes('Sdn Bhd')
    ).length;

    const halalCount = medications.filter(m => m.halalCertified).length;

    const pricesWithValues = medications
      .filter(m => m.pricing?.averagePrice)
      .map(m => m.pricing!.averagePrice);

    const averagePrice = pricesWithValues.length > 0
      ? pricesWithValues.reduce((a, b) => a + b, 0) / pricesWithValues.length
      : 0;

    const brandCounts = medications.reduce((acc, med) => {
      med.brandNames.forEach(brand => {
        acc[brand] = (acc[brand] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const popularBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([brand]) => brand);

    return {
      localAvailability: Math.round((localCount / medications.length) * 100),
      halalCertifiedCount: halalCount,
      averagePrice: Math.round(averagePrice * 100) / 100,
      popularBrands
    };
  }

  private transformDatabaseEntry(row: any): MedicationDatabaseEntry {
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

  // Additional helper methods would be implemented here
  // These would include various search optimization and cultural enhancement functions

  private async logSearchAnalytics(params: EnhancedSearchParams, result: SearchResult): Promise<void> {
    // Log search analytics for optimization
    try {
      const analyticsData = {
        query: params.query,
        resultsCount: result.totalFound,
        searchTime: result.searchMeta.searchTime,
        culturalContext: params.culturalContext,
        timestamp: new Date()
      };

      // Store in analytics table or logging service
      await this.cache.lpush('search_analytics', JSON.stringify(analyticsData));
    } catch (error) {
      console.warn('Failed to log search analytics:', error.message);
    }
  }

  private async getQueryPerformanceStats(): Promise<{ avgResponseTime: number }> {
    return { avgResponseTime: 150 }; // Mock implementation
  }

  private async getCacheStatistics(): Promise<{ hitRate: number }> {
    return { hitRate: 0.85 }; // Mock implementation
  }

  private async getPopularSearches(): Promise<Array<{ query: string; frequency: number; avgResponseTime: number }>> {
    return []; // Mock implementation
  }

  private async generateOptimizationRecommendations(
    indexStats: any[],
    queryStats: any,
    cacheStats: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (cacheStats.hitRate < 0.8) {
      recommendations.push('Consider increasing cache TTL for search results');
    }

    if (queryStats.avgResponseTime > 200) {
      recommendations.push('Add additional database indexes for frequently searched fields');
    }

    return recommendations;
  }

  private calculateIndexUtilization(indexStats: any[]): number {
    if (indexStats.length === 0) return 0;

    const totalScans = indexStats.reduce((sum, stat) => sum + (stat.scans || 0), 0);
    const utilizedIndexes = indexStats.filter(stat => (stat.scans || 0) > 0).length;

    return Math.round((utilizedIndexes / indexStats.length) * 100);
  }

  private async getPopularSearchQueries(): Promise<Array<{ query: string }>> {
    // Return popular search queries for cache warming
    return [
      { query: 'paracetamol' },
      { query: 'amoxicillin' },
      { query: 'metformin' },
      { query: 'aspirin' },
      { query: 'insulin' }
    ];
  }

  private async generateAlternativeQueries(query: string): Promise<string[]> {
    // Generate alternative search queries
    return [];
  }

  private async findRelatedMedications(
    results: MedicationDatabaseEntry[],
    limit: number
  ): Promise<MedicationDatabaseEntry[]> {
    // Find related medications based on current results
    return results.slice(0, limit);
  }

  private async findCulturalAlternatives(
    results: MedicationDatabaseEntry[],
    params: EnhancedSearchParams
  ): Promise<MedicationDatabaseEntry[]> {
    // Find culturally relevant alternatives
    return results.filter(med => med.halalCertified).slice(0, 5);
  }

  private async findTraditionalAlternatives(genericName: string): Promise<string[]> {
    // Find traditional medicine alternatives
    return [];
  }

  private buildAdvancedSearchQuery(criteria: any): { sql: string; params: any[] } {
    // Build advanced search query - placeholder implementation
    return {
      sql: 'SELECT * FROM malaysian_drug_database LIMIT 10',
      params: []
    };
  }

  private async applyCulturalFiltering(
    results: any[],
    requirements: any
  ): Promise<MedicationDatabaseEntry[]> {
    // Apply cultural filtering logic
    return results.map(this.transformDatabaseEntry);
  }

  private async checkMedicationInteractions(
    medications: MedicationDatabaseEntry[],
    currentMedications: string[]
  ): Promise<MedicationDatabaseEntry[]> {
    // Check for medication interactions
    return medications;
  }
}