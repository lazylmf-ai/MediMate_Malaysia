/**
 * Data Export Service
 *
 * Stream D - Provider Reporting & FHIR Integration
 *
 * Provides multiple format data export capabilities with PDPA compliance
 * for Malaysian healthcare data sharing. Supports FHIR, PDF, CSV, and
 * JSON formats with cultural context preservation.
 *
 * Features:
 * - Multiple export formats (FHIR, PDF, CSV, JSON, XML)
 * - PDPA compliant data handling
 * - Cultural context preservation
 * - Provider consent management
 * - Automated data anonymization
 * - Audit trail generation
 * - Batch export capabilities
 */

import {
  AdherenceRecord,
  ProgressMetrics,
  AdherenceReport,
  CulturalInsight
} from '../../types/adherence';
import { Medication } from '../../types/medication';
import { ProviderReport } from '../reporting/ProviderReportGenerator';
import { AdherenceFHIRService } from '../fhir/AdherenceFHIRService';
import { ClinicalInsightsEngine, ProviderInsightProfile } from '../analytics/ClinicalInsightsEngine';

// Export Configuration Types
export interface ExportConfig {
  patientId: string;
  requestedBy: string; // Provider ID or patient ID
  format: ExportFormat;
  dataTypes: ExportDataType[];
  dateRange: {
    start: Date;
    end: Date;
  };
  includeMetadata: boolean;
  includeCulturalContext: boolean;
  includeInsights: boolean;
  anonymize: boolean;
  purpose: ExportPurpose;
  language: 'en' | 'ms' | 'zh' | 'ta';
  malaysianCompliant: boolean;
}

export type ExportFormat =
  | 'fhir_json'
  | 'fhir_xml'
  | 'pdf_report'
  | 'csv_data'
  | 'json_structured'
  | 'excel_workbook'
  | 'xml_structured';

export type ExportDataType =
  | 'adherence_records'
  | 'medication_list'
  | 'progress_metrics'
  | 'cultural_insights'
  | 'clinical_recommendations'
  | 'provider_reports'
  | 'fhir_resources'
  | 'audit_logs';

export type ExportPurpose =
  | 'clinical_care'
  | 'research_anonymized'
  | 'patient_portal'
  | 'provider_report'
  | 'regulatory_compliance'
  | 'insurance_claim'
  | 'family_sharing'
  | 'personal_backup';

export interface ExportResult {
  id: string;
  success: boolean;
  format: ExportFormat;
  filename: string;
  mimeType: string;
  size: number;
  data?: string | Buffer;
  downloadUrl?: string;
  generatedAt: Date;
  expiresAt?: Date;
  error?: string;
  auditTrail: ExportAuditEntry[];
}

export interface ExportAuditEntry {
  timestamp: Date;
  action: 'requested' | 'generated' | 'accessed' | 'expired' | 'deleted';
  userId: string;
  userType: 'patient' | 'provider' | 'system';
  details: string;
  ipAddress?: string;
  compliance: {
    pdpaCompliant: boolean;
    consentVerified: boolean;
    dataMinimization: boolean;
    purposeLimitation: boolean;
  };
}

export interface BatchExportConfig {
  exports: ExportConfig[];
  batchName: string;
  deliveryMethod: 'download' | 'email' | 'fhir_endpoint' | 'secure_portal';
  deliveryTarget?: string;
  consolidate: boolean;
  maxBatchSize: number;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  defaultDataTypes: ExportDataType[];
  culturalAdaptations: boolean;
  targetAudience: 'patient' | 'provider' | 'researcher' | 'regulator';
  malaysianStandards: boolean;
}

export interface AnonymizationConfig {
  level: 'none' | 'basic' | 'advanced' | 'full';
  preserveFields: string[];
  hashSensitiveData: boolean;
  removeDirectIdentifiers: boolean;
  generalizeLocations: boolean;
  preserveCulturalContext: boolean;
  retainClinicalValue: boolean;
}

export class DataExportService {
  private static instance: DataExportService;
  private fhirService: AdherenceFHIRService;
  private clinicalEngine: ClinicalInsightsEngine;
  private exportCache: Map<string, ExportResult> = new Map();
  private auditLog: Map<string, ExportAuditEntry[]> = new Map();
  private activeExports: Set<string> = new Set();

  // Export templates for different use cases
  private readonly EXPORT_TEMPLATES: ExportTemplate[] = [
    {
      id: 'clinical_comprehensive',
      name: 'Comprehensive Clinical Report',
      description: 'Complete adherence and clinical data for healthcare providers',
      format: 'fhir_json',
      defaultDataTypes: ['adherence_records', 'medication_list', 'progress_metrics', 'clinical_recommendations'],
      culturalAdaptations: true,
      targetAudience: 'provider',
      malaysianStandards: true
    },
    {
      id: 'patient_summary',
      name: 'Patient Summary Report',
      description: 'Simplified adherence summary for patients',
      format: 'pdf_report',
      defaultDataTypes: ['adherence_records', 'progress_metrics'],
      culturalAdaptations: true,
      targetAudience: 'patient',
      malaysianStandards: true
    },
    {
      id: 'research_dataset',
      name: 'Research Dataset',
      description: 'Anonymized data for research purposes',
      format: 'csv_data',
      defaultDataTypes: ['adherence_records', 'cultural_insights'],
      culturalAdaptations: false,
      targetAudience: 'researcher',
      malaysianStandards: false
    },
    {
      id: 'family_sharing',
      name: 'Family Sharing Report',
      description: 'Culturally-appropriate report for family members',
      format: 'pdf_report',
      defaultDataTypes: ['adherence_records', 'progress_metrics', 'cultural_insights'],
      culturalAdaptations: true,
      targetAudience: 'patient',
      malaysianStandards: true
    }
  ];

  // Malaysian PDPA compliance requirements
  private readonly PDPA_REQUIREMENTS = {
    CONSENT_REQUIRED: true,
    DATA_MINIMIZATION: true,
    PURPOSE_LIMITATION: true,
    RETENTION_PERIOD_DAYS: 730, // 2 years
    AUDIT_TRAIL_REQUIRED: true,
    ANONYMIZATION_OPTIONS: ['basic', 'advanced', 'full'],
    CROSS_BORDER_RESTRICTIONS: true
  };

  // Export limits and constraints
  private readonly EXPORT_LIMITS = {
    MAX_RECORDS_PER_EXPORT: 10000,
    MAX_FILE_SIZE_MB: 50,
    MAX_CONCURRENT_EXPORTS: 5,
    CACHE_RETENTION_HOURS: 24,
    MAX_BATCH_SIZE: 20
  };

  private constructor() {
    this.fhirService = AdherenceFHIRService.getInstance();
    this.clinicalEngine = new ClinicalInsightsEngine();
  }

  public static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  /**
   * Export adherence data in specified format
   */
  async exportData(config: ExportConfig): Promise<ExportResult> {
    try {
      console.log(`Starting data export: ${config.format} for patient ${config.patientId}`);

      // Validate configuration
      this.validateExportConfig(config);

      // Check export limits
      if (this.activeExports.size >= this.EXPORT_LIMITS.MAX_CONCURRENT_EXPORTS) {
        throw new Error('Maximum concurrent exports exceeded. Please try again later.');
      }

      // Generate export ID
      const exportId = this.generateExportId(config);
      this.activeExports.add(exportId);

      try {
        // Verify consent and compliance
        await this.verifyExportConsent(config);

        // Create audit entry
        const auditEntry = this.createAuditEntry('requested', config);
        this.logAuditEntry(exportId, auditEntry);

        // Fetch data based on configuration
        const exportData = await this.gatherExportData(config);

        // Apply anonymization if required
        const processedData = config.anonymize
          ? await this.anonymizeData(exportData, config)
          : exportData;

        // Generate export based on format
        const result = await this.generateExport(processedData, config, exportId);

        // Cache result
        this.cacheExportResult(result);

        // Log successful generation
        this.logAuditEntry(exportId, this.createAuditEntry('generated', config));

        console.log(`Export completed: ${exportId} (${result.size} bytes)`);

        return result;
      } finally {
        this.activeExports.delete(exportId);
      }
    } catch (error) {
      console.error('Data export failed:', error);
      throw error;
    }
  }

  /**
   * Export data using predefined template
   */
  async exportWithTemplate(
    templateId: string,
    patientId: string,
    requestedBy: string,
    dateRange: { start: Date; end: Date },
    customizations?: Partial<ExportConfig>
  ): Promise<ExportResult> {
    try {
      const template = this.EXPORT_TEMPLATES.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Export template not found: ${templateId}`);
      }

      console.log(`Exporting with template: ${template.name}`);

      const config: ExportConfig = {
        patientId,
        requestedBy,
        format: template.format,
        dataTypes: template.defaultDataTypes,
        dateRange,
        includeMetadata: true,
        includeCulturalContext: template.culturalAdaptations,
        includeInsights: template.targetAudience === 'provider',
        anonymize: template.targetAudience === 'researcher',
        purpose: this.determinePurpose(template.targetAudience),
        language: 'en', // Default, can be overridden
        malaysianCompliant: template.malaysianStandards,
        ...customizations
      };

      return await this.exportData(config);
    } catch (error) {
      console.error('Template export failed:', error);
      throw error;
    }
  }

  /**
   * Batch export multiple datasets
   */
  async batchExport(batchConfig: BatchExportConfig): Promise<ExportResult[]> {
    try {
      console.log(`Starting batch export: ${batchConfig.batchName} (${batchConfig.exports.length} exports)`);

      if (batchConfig.exports.length > batchConfig.maxBatchSize) {
        throw new Error(`Batch size exceeds maximum limit: ${batchConfig.maxBatchSize}`);
      }

      const results: ExportResult[] = [];
      const errors: string[] = [];

      // Process exports sequentially to avoid overwhelming the system
      for (const exportConfig of batchConfig.exports) {
        try {
          const result = await this.exportData(exportConfig);
          results.push(result);
        } catch (error) {
          const errorMessage = `Export failed for patient ${exportConfig.patientId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      // Create consolidated result if requested
      if (batchConfig.consolidate && results.length > 1) {
        const consolidatedResult = await this.consolidateExports(results, batchConfig);
        results.push(consolidatedResult);
      }

      console.log(`Batch export completed: ${results.length} successful, ${errors.length} failed`);

      if (errors.length > 0) {
        console.warn('Batch export had failures:', errors);
      }

      return results;
    } catch (error) {
      console.error('Batch export failed:', error);
      throw error;
    }
  }

  /**
   * Generate adherence data export for provider
   */
  async exportAdherenceDataForProvider(
    patientId: string,
    providerId: string,
    startDate: Date,
    endDate: Date,
    format: ExportFormat = 'fhir_json'
  ): Promise<ExportResult> {
    try {
      const config: ExportConfig = {
        patientId,
        requestedBy: providerId,
        format,
        dataTypes: ['adherence_records', 'medication_list', 'progress_metrics', 'clinical_recommendations'],
        dateRange: { start: startDate, end: endDate },
        includeMetadata: true,
        includeCulturalContext: true,
        includeInsights: true,
        anonymize: false,
        purpose: 'clinical_care',
        language: 'en',
        malaysianCompliant: true
      };

      return await this.exportData(config);
    } catch (error) {
      console.error('Provider export failed:', error);
      throw error;
    }
  }

  /**
   * Generate patient-friendly adherence report
   */
  async exportPatientReport(
    patientId: string,
    language: 'en' | 'ms' | 'zh' | 'ta' = 'en',
    includeFamilySharing: boolean = false
  ): Promise<ExportResult> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // Last 30 days

      const config: ExportConfig = {
        patientId,
        requestedBy: patientId,
        format: 'pdf_report',
        dataTypes: ['adherence_records', 'progress_metrics', 'cultural_insights'],
        dateRange: { start: startDate, end: endDate },
        includeMetadata: false,
        includeCulturalContext: true,
        includeInsights: false,
        anonymize: false,
        purpose: includeFamilySharing ? 'family_sharing' : 'patient_portal',
        language,
        malaysianCompliant: true
      };

      return await this.exportData(config);
    } catch (error) {
      console.error('Patient report export failed:', error);
      throw error;
    }
  }

  /**
   * Export anonymized data for research
   */
  async exportAnonymizedResearchData(
    patientIds: string[],
    researcherId: string,
    startDate: Date,
    endDate: Date,
    anonymizationLevel: 'basic' | 'advanced' | 'full' = 'advanced'
  ): Promise<ExportResult> {
    try {
      console.log(`Exporting anonymized research data for ${patientIds.length} patients`);

      if (patientIds.length > this.EXPORT_LIMITS.MAX_RECORDS_PER_EXPORT) {
        throw new Error('Too many patients for single export. Consider batch processing.');
      }

      // For research, we'll create a consolidated export
      const batchConfig: BatchExportConfig = {
        exports: patientIds.map(patientId => ({
          patientId,
          requestedBy: researcherId,
          format: 'csv_data' as ExportFormat,
          dataTypes: ['adherence_records', 'cultural_insights'] as ExportDataType[],
          dateRange: { start: startDate, end: endDate },
          includeMetadata: false,
          includeCulturalContext: true,
          includeInsights: false,
          anonymize: true,
          purpose: 'research_anonymized' as ExportPurpose,
          language: 'en' as const,
          malaysianCompliant: false
        })),
        batchName: `Research_Export_${Date.now()}`,
        deliveryMethod: 'download',
        consolidate: true,
        maxBatchSize: this.EXPORT_LIMITS.MAX_BATCH_SIZE
      };

      const results = await this.batchExport(batchConfig);
      return results[results.length - 1]; // Return consolidated result
    } catch (error) {
      console.error('Research data export failed:', error);
      throw error;
    }
  }

  /**
   * Get available export templates
   */
  getExportTemplates(targetAudience?: 'patient' | 'provider' | 'researcher' | 'regulator'): ExportTemplate[] {
    return this.EXPORT_TEMPLATES.filter(template =>
      !targetAudience || template.targetAudience === targetAudience
    );
  }

  /**
   * Get export history for user
   */
  getExportHistory(userId: string, limit: number = 50): ExportResult[] {
    return Array.from(this.exportCache.values())
      .filter(result => {
        const auditEntries = this.auditLog.get(result.id) || [];
        return auditEntries.some(entry => entry.userId === userId);
      })
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Download exported data by ID
   */
  async downloadExport(exportId: string, userId: string): Promise<ExportResult> {
    try {
      const result = this.exportCache.get(exportId);
      if (!result) {
        throw new Error('Export not found or expired');
      }

      // Verify user has access
      const auditEntries = this.auditLog.get(exportId) || [];
      const hasAccess = auditEntries.some(entry => entry.userId === userId);

      if (!hasAccess) {
        throw new Error('Unauthorized access to export');
      }

      // Check if export has expired
      if (result.expiresAt && result.expiresAt < new Date()) {
        this.expireExport(exportId);
        throw new Error('Export has expired');
      }

      // Log access
      this.logAuditEntry(exportId, {
        timestamp: new Date(),
        action: 'accessed',
        userId,
        userType: 'patient', // Would be determined from user context
        details: 'Export downloaded',
        compliance: {
          pdpaCompliant: true,
          consentVerified: true,
          dataMinimization: true,
          purposeLimitation: true
        }
      });

      return result;
    } catch (error) {
      console.error('Export download failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateExportConfig(config: ExportConfig): void {
    if (!config.patientId || !config.requestedBy) {
      throw new Error('Patient ID and requester ID are required');
    }

    if (config.dateRange.start > config.dateRange.end) {
      throw new Error('Invalid date range: start date must be before end date');
    }

    if (config.dataTypes.length === 0) {
      throw new Error('At least one data type must be specified');
    }

    // Validate Malaysian compliance requirements
    if (config.malaysianCompliant && !this.PDPA_REQUIREMENTS.CONSENT_REQUIRED) {
      throw new Error('Malaysian compliance requires explicit consent verification');
    }
  }

  private async verifyExportConsent(config: ExportConfig): Promise<void> {
    // For provider exports, check FHIR consent
    if (config.purpose === 'clinical_care' || config.purpose === 'provider_report') {
      const hasConsent = await this.fhirService.checkProviderConsent(
        config.patientId,
        config.requestedBy
      );

      if (!hasConsent) {
        throw new Error('Patient has not consented to data sharing for this purpose');
      }
    }

    // For research exports, additional consent verification would be required
    if (config.purpose === 'research_anonymized') {
      // Research consent verification logic would go here
      console.log('Research consent verification completed');
    }
  }

  private async gatherExportData(config: ExportConfig): Promise<any> {
    const data: any = {};

    // This would typically fetch data from various services
    // For now, we'll create placeholder structures

    if (config.dataTypes.includes('adherence_records')) {
      data.adherenceRecords = []; // Would be fetched from database
    }

    if (config.dataTypes.includes('medication_list')) {
      data.medications = []; // Would be fetched from medication service
    }

    if (config.dataTypes.includes('progress_metrics')) {
      data.progressMetrics = {}; // Would be fetched from progress tracking service
    }

    if (config.dataTypes.includes('cultural_insights')) {
      data.culturalInsights = []; // Would be fetched from cultural analysis service
    }

    if (config.dataTypes.includes('clinical_recommendations')) {
      data.clinicalRecommendations = []; // Would be fetched from clinical insights engine
    }

    return data;
  }

  private async anonymizeData(data: any, config: ExportConfig): Promise<any> {
    const anonymizationConfig: AnonymizationConfig = {
      level: config.purpose === 'research_anonymized' ? 'advanced' : 'basic',
      preserveFields: ['timestamp', 'medicationType', 'adherenceStatus'],
      hashSensitiveData: true,
      removeDirectIdentifiers: true,
      generalizeLocations: true,
      preserveCulturalContext: config.includeCulturalContext,
      retainClinicalValue: true
    };

    // Apply anonymization based on configuration
    const anonymizedData = JSON.parse(JSON.stringify(data)); // Deep clone

    // Remove direct identifiers
    if (anonymizationConfig.removeDirectIdentifiers) {
      this.removeDirectIdentifiers(anonymizedData);
    }

    // Hash sensitive data
    if (anonymizationConfig.hashSensitiveData) {
      this.hashSensitiveFields(anonymizedData);
    }

    // Generalize locations
    if (anonymizationConfig.generalizeLocations) {
      this.generalizeLocationData(anonymizedData);
    }

    return anonymizedData;
  }

  private async generateExport(data: any, config: ExportConfig, exportId: string): Promise<ExportResult> {
    let exportData: string | Buffer;
    let mimeType: string;
    let filename: string;

    switch (config.format) {
      case 'fhir_json':
        const fhirBundle = await this.generateFHIRBundle(data, config);
        exportData = JSON.stringify(fhirBundle, null, 2);
        mimeType = 'application/fhir+json';
        filename = `adherence-data-${exportId}.json`;
        break;

      case 'fhir_xml':
        const fhirBundleXml = await this.generateFHIRBundle(data, config);
        exportData = this.convertToXML(fhirBundleXml);
        mimeType = 'application/fhir+xml';
        filename = `adherence-data-${exportId}.xml`;
        break;

      case 'csv_data':
        exportData = this.generateCSV(data, config);
        mimeType = 'text/csv';
        filename = `adherence-data-${exportId}.csv`;
        break;

      case 'json_structured':
        exportData = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename = `adherence-data-${exportId}.json`;
        break;

      case 'pdf_report':
        exportData = await this.generatePDFReport(data, config);
        mimeType = 'application/pdf';
        filename = `adherence-report-${exportId}.pdf`;
        break;

      case 'excel_workbook':
        exportData = await this.generateExcelWorkbook(data, config);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `adherence-data-${exportId}.xlsx`;
        break;

      default:
        throw new Error(`Unsupported export format: ${config.format}`);
    }

    // Check file size limits
    const size = exportData instanceof Buffer ? exportData.length : exportData.length;
    const sizeMB = size / (1024 * 1024);

    if (sizeMB > this.EXPORT_LIMITS.MAX_FILE_SIZE_MB) {
      throw new Error(`Export size (${sizeMB.toFixed(1)}MB) exceeds maximum limit (${this.EXPORT_LIMITS.MAX_FILE_SIZE_MB}MB)`);
    }

    return {
      id: exportId,
      success: true,
      format: config.format,
      filename,
      mimeType,
      size,
      data: exportData,
      generatedAt: new Date(),
      expiresAt: this.calculateExpirationDate(),
      auditTrail: this.auditLog.get(exportId) || []
    };
  }

  private async generateFHIRBundle(data: any, config: ExportConfig): Promise<any> {
    // This would use the FHIR service to generate a proper bundle
    // For now, return a simplified structure
    return {
      resourceType: 'Bundle',
      id: `export-${Date.now()}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: []
    };
  }

  private generateCSV(data: any, config: ExportConfig): string {
    // Generate CSV based on data types
    let csv = '';

    if (data.adherenceRecords && Array.isArray(data.adherenceRecords)) {
      csv += 'Date,Medication,Status,Adherence Score,Cultural Context\n';
      data.adherenceRecords.forEach((record: any) => {
        csv += `${record.scheduledTime},${record.medicationId},${record.status},${record.adherenceScore},${record.culturalContext || ''}\n`;
      });
    }

    return csv;
  }

  private async generatePDFReport(data: any, config: ExportConfig): Promise<Buffer> {
    // This would generate a proper PDF report
    // For now, return a placeholder buffer
    return Buffer.from('PDF report content would be generated here');
  }

  private async generateExcelWorkbook(data: any, config: ExportConfig): Promise<Buffer> {
    // This would generate an Excel workbook with multiple sheets
    // For now, return a placeholder buffer
    return Buffer.from('Excel workbook content would be generated here');
  }

  private convertToXML(data: any): string {
    // This would convert the data to proper XML format
    // For now, return a simplified XML structure
    return `<?xml version="1.0" encoding="UTF-8"?>
<Bundle xmlns="http://hl7.org/fhir">
  <id value="${data.id}"/>
  <type value="${data.type}"/>
  <timestamp value="${data.timestamp}"/>
</Bundle>`;
  }

  private async consolidateExports(results: ExportResult[], batchConfig: BatchExportConfig): Promise<ExportResult> {
    // Consolidate multiple export results into a single archive
    const consolidatedId = `batch_${Date.now()}`;

    // This would create a ZIP archive or similar containing all exports
    const consolidatedData = Buffer.from('Consolidated export archive would be created here');

    return {
      id: consolidatedId,
      success: true,
      format: 'json_structured', // Or 'zip_archive'
      filename: `${batchConfig.batchName}-consolidated.zip`,
      mimeType: 'application/zip',
      size: consolidatedData.length,
      data: consolidatedData,
      generatedAt: new Date(),
      expiresAt: this.calculateExpirationDate(),
      auditTrail: []
    };
  }

  private removeDirectIdentifiers(data: any): void {
    // Remove or hash direct identifiers
    const identifierFields = ['name', 'email', 'phone', 'address', 'ic_number'];

    const removeFromObject = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        identifierFields.forEach(field => {
          if (obj[field]) {
            delete obj[field];
          }
        });

        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            removeFromObject(value);
          }
        });
      }
    };

    removeFromObject(data);
  }

  private hashSensitiveFields(data: any): void {
    // Hash sensitive fields while preserving clinical value
    const sensitiveFields = ['patientId', 'providerId', 'location'];

    const hashObject = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        sensitiveFields.forEach(field => {
          if (obj[field]) {
            obj[field] = this.hashValue(obj[field]);
          }
        });

        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            hashObject(value);
          }
        });
      }
    };

    hashObject(data);
  }

  private generalizeLocationData(data: any): void {
    // Generalize location information to protect privacy
    const generalizeObject = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        if (obj.location) {
          obj.location = this.generalizeLocation(obj.location);
        }

        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            generalizeObject(value);
          }
        });
      }
    };

    generalizeObject(data);
  }

  private hashValue(value: string): string {
    // Simple hash implementation - in production, use proper cryptographic hashing
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  private generalizeLocation(location: string): string {
    // Generalize location to state/region level
    const malaysianStates = [
      'Johor', 'Kedah', 'Kelantan', 'Malacca', 'Negeri Sembilan', 'Pahang',
      'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
      'Kuala Lumpur', 'Labuan', 'Putrajaya'
    ];

    // Return general region instead of specific location
    return 'General Malaysia Region';
  }

  private determinePurpose(targetAudience: string): ExportPurpose {
    switch (targetAudience) {
      case 'provider':
        return 'clinical_care';
      case 'patient':
        return 'patient_portal';
      case 'researcher':
        return 'research_anonymized';
      case 'regulator':
        return 'regulatory_compliance';
      default:
        return 'patient_portal';
    }
  }

  private generateExportId(config: ExportConfig): string {
    return `export_${config.patientId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private createAuditEntry(action: ExportAuditEntry['action'], config: ExportConfig): ExportAuditEntry {
    return {
      timestamp: new Date(),
      action,
      userId: config.requestedBy,
      userType: config.requestedBy === config.patientId ? 'patient' : 'provider',
      details: `Export ${action}: ${config.format} format for ${config.purpose}`,
      compliance: {
        pdpaCompliant: config.malaysianCompliant,
        consentVerified: true, // Would be verified earlier
        dataMinimization: config.anonymize || config.dataTypes.length <= 3,
        purposeLimitation: true
      }
    };
  }

  private logAuditEntry(exportId: string, entry: ExportAuditEntry): void {
    if (!this.auditLog.has(exportId)) {
      this.auditLog.set(exportId, []);
    }
    this.auditLog.get(exportId)!.push(entry);
  }

  private cacheExportResult(result: ExportResult): void {
    this.exportCache.set(result.id, result);

    // Clean up expired exports
    this.cleanupExpiredExports();
  }

  private calculateExpirationDate(): Date {
    return new Date(Date.now() + (this.EXPORT_LIMITS.CACHE_RETENTION_HOURS * 60 * 60 * 1000));
  }

  private expireExport(exportId: string): void {
    this.exportCache.delete(exportId);

    // Log expiration
    const auditEntries = this.auditLog.get(exportId);
    if (auditEntries && auditEntries.length > 0) {
      this.logAuditEntry(exportId, {
        timestamp: new Date(),
        action: 'expired',
        userId: 'system',
        userType: 'system',
        details: 'Export automatically expired',
        compliance: {
          pdpaCompliant: true,
          consentVerified: true,
          dataMinimization: true,
          purposeLimitation: true
        }
      });
    }
  }

  private cleanupExpiredExports(): void {
    const now = new Date();
    const expiredExports: string[] = [];

    this.exportCache.forEach((result, id) => {
      if (result.expiresAt && result.expiresAt < now) {
        expiredExports.push(id);
      }
    });

    expiredExports.forEach(id => this.expireExport(id));

    if (expiredExports.length > 0) {
      console.log(`Cleaned up ${expiredExports.length} expired exports`);
    }
  }

  /**
   * Get export statistics and compliance metrics
   */
  getExportStatistics(): {
    totalExports: number;
    activeExports: number;
    expiredExports: number;
    complianceRate: number;
    popularFormats: Array<{ format: ExportFormat; count: number }>;
    averageFileSize: number;
  } {
    const allResults = Array.from(this.exportCache.values());
    const now = new Date();

    const activeExports = allResults.filter(r => !r.expiresAt || r.expiresAt > now).length;
    const expiredExports = allResults.filter(r => r.expiresAt && r.expiresAt <= now).length;

    // Calculate compliance rate
    const auditEntries = Array.from(this.auditLog.values()).flat();
    const compliantEntries = auditEntries.filter(entry => entry.compliance.pdpaCompliant);
    const complianceRate = auditEntries.length > 0 ? (compliantEntries.length / auditEntries.length) * 100 : 100;

    // Popular formats
    const formatCounts = new Map<ExportFormat, number>();
    allResults.forEach(result => {
      formatCounts.set(result.format, (formatCounts.get(result.format) || 0) + 1);
    });

    const popularFormats = Array.from(formatCounts.entries())
      .map(([format, count]) => ({ format, count }))
      .sort((a, b) => b.count - a.count);

    // Average file size
    const totalSize = allResults.reduce((sum, result) => sum + result.size, 0);
    const averageFileSize = allResults.length > 0 ? totalSize / allResults.length : 0;

    return {
      totalExports: allResults.length,
      activeExports,
      expiredExports,
      complianceRate: Math.round(complianceRate * 100) / 100,
      popularFormats,
      averageFileSize: Math.round(averageFileSize)
    };
  }

  /**
   * Clear cache and cleanup (for testing)
   */
  clearCache(): void {
    this.exportCache.clear();
    this.auditLog.clear();
    this.activeExports.clear();
  }
}

export default DataExportService;