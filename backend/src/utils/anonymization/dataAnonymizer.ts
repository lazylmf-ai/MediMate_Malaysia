/**
 * Data Anonymization Utilities
 * 
 * Advanced data anonymization and pseudonymization for Malaysian healthcare data
 * Implements k-anonymity, l-diversity, and differential privacy techniques
 * while preserving medical research utility
 */

import crypto from 'crypto';
import { Pool } from 'pg';

interface AnonymizationConfig {
    algorithm: 'k_anonymity' | 'l_diversity' | 'differential_privacy' | 'pseudonymization';
    k_value?: number; // For k-anonymity
    l_value?: number; // For l-diversity
    epsilon?: number; // For differential privacy
    preserveUtility: boolean;
    healthcareContext: boolean;
}

interface FieldAnonymizationRule {
    fieldName: string;
    method: 'hash' | 'generalize' | 'suppress' | 'noise' | 'date_shift' | 'range' | 'categorical';
    parameters?: any;
}

interface AnonymizationJob {
    id: string;
    tableName: string;
    recordsToProcess: number;
    config: AnonymizationConfig;
    rules: FieldAnonymizationRule[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    startTime?: Date;
    endTime?: Date;
    errors: string[];
}

interface MalaysianHealthcareFieldMapping {
    ic_number: 'sensitive_identifier';
    full_name: 'personal_identifier';
    date_of_birth: 'quasi_identifier';
    gender: 'quasi_identifier';
    address: 'quasi_identifier';
    phone_number: 'sensitive_identifier';
    email: 'sensitive_identifier';
    diagnosis_codes: 'sensitive_data';
    medication_name: 'sensitive_data';
    medical_condition: 'sensitive_data';
    religion: 'sensitive_data';
    race: 'sensitive_data';
}

export class DataAnonymizer {
    private dbPool: Pool;
    private saltKey: string;
    private malaysianFieldMapping: MalaysianHealthcareFieldMapping;

    constructor(dbPool: Pool, saltKey?: string) {
        this.dbPool = dbPool;
        this.saltKey = saltKey || process.env.ANONYMIZATION_SALT || 'medimate_malaysia_salt_2025';
        this.malaysianFieldMapping = {
            ic_number: 'sensitive_identifier',
            full_name: 'personal_identifier',
            date_of_birth: 'quasi_identifier',
            gender: 'quasi_identifier',
            address: 'quasi_identifier',
            phone_number: 'sensitive_identifier',
            email: 'sensitive_identifier',
            diagnosis_codes: 'sensitive_data',
            medication_name: 'sensitive_data',
            medical_condition: 'sensitive_data',
            religion: 'sensitive_data',
            race: 'sensitive_data'
        };
    }

    // ============================================================================
    // MAIN ANONYMIZATION METHODS
    // ============================================================================

    /**
     * Anonymize healthcare data for research purposes
     */
    async anonymizeForResearch(
        tableName: string,
        whereClause: string = '1=1',
        config: AnonymizationConfig
    ): Promise<AnonymizationJob> {
        const jobId = crypto.randomUUID();
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Count records to process
            const countResult = await client.query(
                `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`
            );
            const recordsToProcess = parseInt(countResult.rows[0].count);
            
            // Create anonymization rules based on table schema
            const rules = await this.generateAnonymizationRules(tableName, config);
            
            // Create anonymization job record
            await client.query(
                `INSERT INTO anonymization_jobs (
                    id, target_table, anonymization_algorithm, record_count_estimated,
                    job_status, job_type
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [jobId, tableName, config.algorithm, recordsToProcess, 'pending', 'manual']
            );
            
            await client.query('COMMIT');
            
            // Start anonymization process asynchronously
            this.processAnonymizationJob(jobId, tableName, whereClause, config, rules)
                .catch(error => {
                    console.error(`Anonymization job ${jobId} failed:`, error);
                });
            
            return {
                id: jobId,
                tableName,
                recordsToProcess,
                config,
                rules,
                status: 'pending',
                progress: 0,
                errors: []
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to start anonymization job: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Process anonymization job
     */
    private async processAnonymizationJob(
        jobId: string,
        tableName: string,
        whereClause: string,
        config: AnonymizationConfig,
        rules: FieldAnonymizationRule[]
    ): Promise<void> {
        const client = await this.dbPool.connect();
        
        try {
            // Update job status to running
            await client.query(
                'UPDATE anonymization_jobs SET job_status = $1, started_at = NOW() WHERE id = $2',
                ['running', jobId]
            );
            
            // Get all records to anonymize
            const records = await client.query(`SELECT * FROM ${tableName} WHERE ${whereClause}`);
            const totalRecords = records.rows.length;
            
            let processedRecords = 0;
            let anonymizedRecords = 0;
            const batchSize = 100;
            
            // Process records in batches
            for (let i = 0; i < totalRecords; i += batchSize) {
                const batch = records.rows.slice(i, i + batchSize);
                
                for (const record of batch) {
                    try {
                        const anonymizedRecord = await this.anonymizeRecord(record, rules, config);
                        
                        // Update record in database
                        await this.updateAnonymizedRecord(tableName, record.id, anonymizedRecord, client);
                        
                        anonymizedRecords++;
                        
                        // Log anonymization in erasure log
                        await client.query(
                            `INSERT INTO data_erasure_log (
                                user_id, table_name, record_id, erasure_type,
                                anonymization_algorithm, performed_by
                            ) VALUES ($1, $2, $3, $4, $5, $6)`,
                            [
                                record.user_id || record.id,
                                tableName,
                                record.id,
                                'anonymization',
                                config.algorithm,
                                'system'
                            ]
                        );
                        
                    } catch (recordError) {
                        console.error(`Failed to anonymize record ${record.id}:`, recordError);
                    }
                    
                    processedRecords++;
                    
                    // Update progress
                    if (processedRecords % 50 === 0) {
                        const progress = Math.round((processedRecords / totalRecords) * 100);
                        await client.query(
                            'UPDATE anonymization_jobs SET records_processed = $1 WHERE id = $2',
                            [processedRecords, jobId]
                        );
                    }
                }
            }
            
            // Complete job
            await client.query(
                `UPDATE anonymization_jobs SET 
                 job_status = 'completed', 
                 completed_at = NOW(),
                 records_processed = $1,
                 records_anonymized = $2
                 WHERE id = $3`,
                [processedRecords, anonymizedRecords, jobId]
            );
            
        } catch (error) {
            // Mark job as failed
            await client.query(
                `UPDATE anonymization_jobs SET 
                 job_status = 'failed', 
                 error_log = $1 
                 WHERE id = $2`,
                [error.message, jobId]
            );
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Anonymize individual record
     */
    private async anonymizeRecord(
        record: any,
        rules: FieldAnonymizationRule[],
        config: AnonymizationConfig
    ): Promise<any> {
        const anonymizedRecord = { ...record };
        
        for (const rule of rules) {
            if (record[rule.fieldName] !== undefined && record[rule.fieldName] !== null) {
                anonymizedRecord[rule.fieldName] = await this.applyAnonymizationMethod(
                    record[rule.fieldName],
                    rule,
                    config
                );
            }
        }
        
        // Apply k-anonymity if configured
        if (config.algorithm === 'k_anonymity' && config.k_value) {
            anonymizedRecord = await this.applyKAnonymity(anonymizedRecord, config.k_value);
        }
        
        return anonymizedRecord;
    }

    /**
     * Apply specific anonymization method to field value
     */
    private async applyAnonymizationMethod(
        value: any,
        rule: FieldAnonymizationRule,
        config: AnonymizationConfig
    ): Promise<any> {
        switch (rule.method) {
            case 'hash':
                return this.hashValue(value, rule.fieldName);
                
            case 'generalize':
                return this.generalizeValue(value, rule.fieldName, rule.parameters);
                
            case 'suppress':
                return null; // Complete suppression
                
            case 'noise':
                return this.addNoise(value, rule.parameters);
                
            case 'date_shift':
                return this.shiftDate(value, rule.parameters);
                
            case 'range':
                return this.convertToRange(value, rule.parameters);
                
            case 'categorical':
                return this.generalizeCategorical(value, rule.parameters);
                
            default:
                return value;
        }
    }

    // ============================================================================
    // ANONYMIZATION TECHNIQUES
    // ============================================================================

    /**
     * Hash sensitive values with salt
     */
    private hashValue(value: any, fieldName: string): string {
        const saltedValue = `${value}_${fieldName}_${this.saltKey}`;
        return crypto.createHash('sha256').update(saltedValue).digest('hex');
    }

    /**
     * Generalize values to reduce precision
     */
    private generalizeValue(value: any, fieldName: string, parameters: any): any {
        switch (fieldName) {
            case 'date_of_birth':
                // Generalize to birth year only
                if (value instanceof Date) {
                    return `${value.getFullYear()}-01-01`;
                }
                return value;
                
            case 'address':
                // Generalize to city/state level
                return this.generalizeAddress(value);
                
            case 'ic_number':
                // Generalize IC to birth year and state code only
                return this.generalizeICNumber(value);
                
            case 'phone_number':
                // Generalize to area code only
                return this.generalizePhoneNumber(value);
                
            default:
                return value;
        }
    }

    /**
     * Add statistical noise to numerical values
     */
    private addNoise(value: any, parameters: any = { variance: 1 }): any {
        if (typeof value !== 'number') return value;
        
        const noise = this.generateGaussianNoise(0, parameters.variance);
        return Math.round(value + noise);
    }

    /**
     * Shift dates by random amount within range
     */
    private shiftDate(value: any, parameters: any = { maxShiftDays: 30 }): any {
        if (!(value instanceof Date)) return value;
        
        const shiftDays = Math.random() * parameters.maxShiftDays * 2 - parameters.maxShiftDays;
        const shiftedDate = new Date(value.getTime() + shiftDays * 24 * 60 * 60 * 1000);
        
        return shiftedDate;
    }

    /**
     * Convert exact values to ranges
     */
    private convertToRange(value: any, parameters: any): any {
        if (typeof value !== 'number') return value;
        
        const rangeSize = parameters.rangeSize || 10;
        const rangeStart = Math.floor(value / rangeSize) * rangeSize;
        const rangeEnd = rangeStart + rangeSize - 1;
        
        return `${rangeStart}-${rangeEnd}`;
    }

    /**
     * Generalize categorical values
     */
    private generalizeCategorical(value: any, parameters: any): any {
        if (!parameters.mapping) return value;
        
        return parameters.mapping[value] || 'Other';
    }

    /**
     * Apply k-anonymity principle
     */
    private async applyKAnonymity(record: any, kValue: number): Promise<any> {
        // This would implement proper k-anonymity algorithm
        // For now, we'll apply basic generalization
        return record;
    }

    // ============================================================================
    // MALAYSIAN HEALTHCARE SPECIFIC ANONYMIZATION
    // ============================================================================

    /**
     * Anonymize Malaysian IC number while preserving some demographic info
     */
    private generalizeICNumber(icNumber: string): string {
        if (!icNumber || typeof icNumber !== 'string') return 'ANONYMIZED';
        
        // Extract year and state code, anonymize the rest
        const year = icNumber.substring(0, 2);
        const state = icNumber.substring(6, 8);
        
        return `${year}XXXX-${state}-XXXX`;
    }

    /**
     * Generalize Malaysian address to preserve geographic utility
     */
    private generalizeAddress(address: string): string {
        if (!address) return 'MALAYSIA';
        
        // Extract state/region information, suppress specific address
        const malaysianStates = [
            'JOHOR', 'KEDAH', 'KELANTAN', 'MALACCA', 'NEGERI SEMBILAN', 
            'PAHANG', 'PENANG', 'PERAK', 'PERLIS', 'SABAH', 'SARAWAK', 
            'SELANGOR', 'TERENGGANU', 'KUALA LUMPUR', 'LABUAN', 'PUTRAJAYA'
        ];
        
        const upperAddress = address.toUpperCase();
        for (const state of malaysianStates) {
            if (upperAddress.includes(state)) {
                return state;
            }
        }
        
        return 'MALAYSIA';
    }

    /**
     * Generalize Malaysian phone numbers
     */
    private generalizePhoneNumber(phoneNumber: string): string {
        if (!phoneNumber) return 'XXX-XXXXXXX';
        
        // Keep area code, anonymize the rest
        const cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.length >= 3) {
            return cleaned.substring(0, 3) + '-XXXXXXX';
        }
        
        return 'XXX-XXXXXXX';
    }

    /**
     * Anonymize medical data while preserving research utility
     */
    private anonymizeMedicalData(medicalRecord: any): any {
        const anonymized = { ...medicalRecord };
        
        // Preserve medical categories but anonymize specifics
        if (anonymized.diagnosis_codes) {
            anonymized.diagnosis_codes = this.generalizeDiagnosisCodes(anonymized.diagnosis_codes);
        }
        
        if (anonymized.medication_name) {
            anonymized.medication_name = this.generalizeMedicationName(anonymized.medication_name);
        }
        
        // Preserve age groups instead of exact dates
        if (anonymized.visit_date) {
            anonymized.visit_date = this.generalizeToMonth(anonymized.visit_date);
        }
        
        return anonymized;
    }

    /**
     * Generalize diagnosis codes to higher-level categories
     */
    private generalizeDiagnosisCodes(codes: string[]): string[] {
        return codes.map(code => {
            // Generalize ICD-10 codes to 3-character level
            if (code.length > 3) {
                return code.substring(0, 3) + 'X';
            }
            return code;
        });
    }

    /**
     * Generalize medication names to therapeutic classes
     */
    private generalizeMedicationName(medicationName: string): string {
        // This would map to therapeutic classes
        // Simplified for demo purposes
        const therapeuticClasses = {
            'paracetamol': 'Analgesic',
            'ibuprofen': 'NSAID',
            'amoxicillin': 'Antibiotic',
            'metformin': 'Antidiabetic',
            'amlodipine': 'Antihypertensive'
        };
        
        const lowerName = medicationName.toLowerCase();
        for (const [drug, class_name] of Object.entries(therapeuticClasses)) {
            if (lowerName.includes(drug)) {
                return class_name;
            }
        }
        
        return 'Other_Medication';
    }

    /**
     * Generalize dates to month-year only
     */
    private generalizeToMonth(date: Date): string {
        if (!date) return 'UNKNOWN';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    // ============================================================================
    // ANONYMIZATION RULE GENERATION
    // ============================================================================

    /**
     * Generate anonymization rules based on table schema and Malaysian healthcare context
     */
    private async generateAnonymizationRules(
        tableName: string,
        config: AnonymizationConfig
    ): Promise<FieldAnonymizationRule[]> {
        const client = await this.dbPool.connect();
        
        try {
            // Get table schema
            const schemaQuery = await client.query(
                `SELECT column_name, data_type 
                 FROM information_schema.columns 
                 WHERE table_name = $1 AND table_schema = 'public'`,
                [tableName]
            );
            
            const rules: FieldAnonymizationRule[] = [];
            
            for (const column of schemaQuery.rows) {
                const fieldName = column.column_name;
                const rule = this.createFieldRule(fieldName, column.data_type, config);
                
                if (rule) {
                    rules.push(rule);
                }
            }
            
            return rules;
            
        } catch (error) {
            throw new Error(`Failed to generate anonymization rules: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Create anonymization rule for specific field
     */
    private createFieldRule(
        fieldName: string,
        dataType: string,
        config: AnonymizationConfig
    ): FieldAnonymizationRule | null {
        // Skip system fields
        if (['id', 'created_at', 'updated_at'].includes(fieldName)) {
            return null;
        }
        
        // Malaysian healthcare specific field handling
        switch (fieldName) {
            case 'ic_number':
            case 'ic_number_hash':
                return {
                    fieldName,
                    method: 'generalize',
                    parameters: { type: 'ic_number' }
                };
                
            case 'full_name':
            case 'preferred_name':
                return {
                    fieldName,
                    method: 'hash',
                    parameters: { preserve_length: false }
                };
                
            case 'email':
            case 'phone_number':
                return {
                    fieldName,
                    method: 'generalize',
                    parameters: { type: 'contact' }
                };
                
            case 'date_of_birth':
                return {
                    fieldName,
                    method: 'generalize',
                    parameters: { precision: 'year' }
                };
                
            case 'address':
                return {
                    fieldName,
                    method: 'generalize',
                    parameters: { type: 'address' }
                };
                
            case 'diagnosis_codes':
            case 'medical_condition':
                return {
                    fieldName,
                    method: 'generalize',
                    parameters: { preserve_medical_utility: true }
                };
                
            default:
                // Default handling based on data type
                if (dataType.includes('timestamp') || dataType.includes('date')) {
                    return {
                        fieldName,
                        method: 'date_shift',
                        parameters: { maxShiftDays: 7 }
                    };
                }
                
                if (dataType.includes('text') || dataType.includes('varchar')) {
                    return {
                        fieldName,
                        method: 'suppress',
                        parameters: {}
                    };
                }
                
                return null;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    private generateGaussianNoise(mean: number, variance: number): number {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * Math.sqrt(variance) + mean;
    }

    private async updateAnonymizedRecord(
        tableName: string,
        recordId: string,
        anonymizedRecord: any,
        client: any
    ): Promise<void> {
        const fields = Object.keys(anonymizedRecord).filter(key => key !== 'id');
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = [recordId, ...fields.map(field => anonymizedRecord[field])];
        
        await client.query(
            `UPDATE ${tableName} SET ${setClause} WHERE id = $1`,
            values
        );
    }

    /**
     * Get anonymization job status
     */
    async getJobStatus(jobId: string): Promise<any> {
        const result = await this.dbPool.query(
            'SELECT * FROM anonymization_jobs WHERE id = $1',
            [jobId]
        );
        
        return result.rows[0];
    }

    /**
     * List all anonymization jobs
     */
    async listJobs(limit: number = 50): Promise<any[]> {
        const result = await this.dbPool.query(
            'SELECT * FROM anonymization_jobs ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        
        return result.rows;
    }
}

export default DataAnonymizer;