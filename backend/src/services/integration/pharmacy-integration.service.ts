/**
 * Pharmacy Management System Integration Service
 * 
 * Integrates with Malaysian pharmacy systems, drug databases, and prescription management
 * Supports integration with major pharmacy chains and hospital pharmacies across Malaysia
 */

import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { HalalValidationService } from '../cultural/halalValidationService';
import { CDSSIntegrationService } from './cdss-integration.service';
import { 
  MalaysianDrugInfo,
  PrescriptionValidationRequest,
  PrescriptionValidationResponse
} from '../../types/fhir/fhir-operations';
import { v4 as uuidv4 } from 'uuid';

export interface PharmacyConfig {
  draApiUrl: string; // Drug Registration Authority API
  pharmacyNetworkUrl: string;
  halalCertificationUrl: string;
  pricingApiUrl: string;
  stockApiUrl: string;
  timeout: number;
  apiKey: string;
}

export interface PharmacyIntegrationResult {
  success: boolean;
  pharmacyId: string;
  transactionId: string;
  prescriptionId: string;
  processedMedications: Array<{
    drugCode: string;
    drugName: string;
    status: 'available' | 'out_of_stock' | 'discontinued' | 'substitute_suggested';
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    halalStatus: 'halal' | 'haram' | 'syubhah' | 'unknown';
    substitute?: {
      drugCode: string;
      drugName: string;
      reason: string;
    };
  }>;
  totalCost: {
    subtotal: number;
    tax: number;
    total: number;
    currency: 'MYR';
  };
  warnings: string[];
  errors: string[];
  timestamp: string;
}

export interface DrugAvailabilityCheck {
  drugCode: string;
  drugName: string;
  isAvailable: boolean;
  stockLevel: 'high' | 'medium' | 'low' | 'out_of_stock';
  price: {
    amount: number;
    currency: 'MYR';
    lastUpdated: string;
  };
  pharmacies: Array<{
    pharmacyId: string;
    pharmacyName: string;
    location: {
      address: string;
      city: string;
      state: string;
      postalCode: string;
    };
    distance?: number;
    stockLevel: number;
    price: number;
    estimatedWaitTime?: string;
  }>;
  halalCertification: {
    status: 'certified' | 'ingredients_halal' | 'non_halal' | 'unknown';
    certifyingBody?: string;
    certificateNumber?: string;
    expiryDate?: string;
  };
  alternatives?: Array<{
    drugCode: string;
    drugName: string;
    reason: string;
    priceDifference: number;
  }>;
}

export interface PrescriptionSubmission {
  prescriptionId: string;
  patientInfo: {
    nationalId: string;
    name: string;
    dateOfBirth: string;
    contactNumber: string;
  };
  practitionerInfo: {
    license: string;
    name: string;
    facility: string;
  };
  medications: Array<{
    drugCode: string;
    drugName: string;
    strength: string;
    dosageForm: string;
    quantity: number;
    directions: string;
    refills: number;
    daysSupply: number;
  }>;
  specialInstructions?: string[];
  culturalRequirements?: {
    requiresHalal: boolean;
    languagePreference: 'en' | 'ms' | 'zh' | 'ta';
    specialInstructions?: string[];
  };
}

export interface PharmacyNetwork {
  networkId: string;
  networkName: string;
  pharmacies: Array<{
    pharmacyId: string;
    pharmacyName: string;
    license: string;
    location: {
      address: string;
      city: string;
      state: string;
      postalCode: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    operatingHours: {
      [day: string]: {
        open: string;
        close: string;
        is24Hours: boolean;
      };
    };
    services: string[];
    specialties: string[];
    acceptedInsurance: string[];
    contactInfo: {
      phone: string;
      email?: string;
      website?: string;
    };
    isActive: boolean;
    lastUpdated: string;
  }>;
}

export class PharmacyIntegrationService {
  private static instance: PharmacyIntegrationService;
  private axiosInstance: AxiosInstance;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private halalService: HalalValidationService;
  private cdssService: CDSSIntegrationService;
  private config: PharmacyConfig;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.halalService = HalalValidationService.getInstance();
    this.cdssService = CDSSIntegrationService.getInstance();
    this.config = this.loadConfig();
    this.axiosInstance = this.createAxiosInstance();
  }

  public static getInstance(): PharmacyIntegrationService {
    if (!PharmacyIntegrationService.instance) {
      PharmacyIntegrationService.instance = new PharmacyIntegrationService();
    }
    return PharmacyIntegrationService.instance;
  }

  /**
   * Check drug availability across pharmacy network
   */
  public async checkDrugAvailability(drugCode: string, patientLocation?: { latitude: number; longitude: number }): Promise<DrugAvailabilityCheck> {
    try {
      const drugInfo = await this.getDrugInformation(drugCode);
      if (!drugInfo) {
        throw new Error(`Drug not found: ${drugCode}`);
      }

      // Check availability across pharmacy network
      const pharmacyAvailability = await this.checkPharmacyNetworkAvailability(drugCode, patientLocation);

      // Get halal certification status
      const halalStatus = await this.getHalalCertification(drugCode);

      // Find alternatives if needed
      const alternatives = await this.findDrugAlternatives(drugCode);

      const availability: DrugAvailabilityCheck = {
        drugCode,
        drugName: drugInfo.productName,
        isAvailable: pharmacyAvailability.some(p => p.stockLevel > 0),
        stockLevel: this.calculateOverallStockLevel(pharmacyAvailability),
        price: {
          amount: drugInfo.price?.amount || 0,
          currency: 'MYR',
          lastUpdated: drugInfo.lastUpdated
        },
        pharmacies: pharmacyAvailability.map(p => ({
          pharmacyId: p.pharmacyId,
          pharmacyName: p.pharmacyName,
          location: p.location,
          distance: p.distance,
          stockLevel: p.stockLevel,
          price: p.price,
          estimatedWaitTime: p.estimatedWaitTime
        })),
        halalCertification: halalStatus,
        alternatives: alternatives.map(alt => ({
          drugCode: alt.registrationNumber,
          drugName: alt.productName,
          reason: 'Generic equivalent',
          priceDifference: (alt.price?.amount || 0) - (drugInfo.price?.amount || 0)
        }))
      };

      // Store availability check
      await this.storeAvailabilityCheck(availability);

      return availability;

    } catch (error) {
      console.error('Drug availability check failed:', error);
      throw new Error(`Drug availability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit prescription to pharmacy for fulfillment
   */
  public async submitPrescription(prescription: PrescriptionSubmission, pharmacyId: string): Promise<PharmacyIntegrationResult> {
    try {
      const result: PharmacyIntegrationResult = {
        success: false,
        pharmacyId,
        transactionId: uuidv4(),
        prescriptionId: prescription.prescriptionId,
        processedMedications: [],
        totalCost: {
          subtotal: 0,
          tax: 0,
          total: 0,
          currency: 'MYR'
        },
        warnings: [],
        errors: [],
        timestamp: new Date().toISOString()
      };

      // Validate prescription first
      const validationRequest: PrescriptionValidationRequest = {
        prescription: {
          patientId: prescription.patientInfo.nationalId,
          practitionerId: prescription.practitionerInfo.license,
          medications: prescription.medications.map(med => ({
            drugCode: med.drugCode,
            drugName: med.drugName,
            dosage: med.strength,
            frequency: med.directions,
            duration: `${med.daysSupply} days`,
            quantity: med.quantity,
            instructions: med.directions
          }))
        },
        patientProfile: {
          age: this.calculateAgeFromDateOfBirth(prescription.patientInfo.dateOfBirth),
          religiousRestrictions: prescription.culturalRequirements?.requiresHalal ? {
            requiresHalal: true,
            avoidPork: true,
            avoidAlcohol: true
          } : undefined
        }
      };

      const validation = await this.cdssService.validatePrescription(validationRequest);

      if (!validation.isValid) {
        result.errors.push(...validation.issues.filter(i => i.severity === 'error').map(i => i.description));
        result.warnings.push(...validation.issues.filter(i => i.severity === 'warning').map(i => i.description));
        
        if (result.errors.length > 0) {
          await this.storePrescriptionSubmission(prescription, result);
          return result;
        }
      }

      // Process each medication
      let subtotal = 0;
      for (const medication of prescription.medications) {
        try {
          const drugInfo = await this.getDrugInformation(medication.drugCode);
          if (!drugInfo) {
            result.errors.push(`Drug not found: ${medication.drugName}`);
            continue;
          }

          // Check availability at specific pharmacy
          const availability = await this.checkPharmacyDrugAvailability(pharmacyId, medication.drugCode);
          
          let status: 'available' | 'out_of_stock' | 'discontinued' | 'substitute_suggested' = 'available';
          let substitute = undefined;

          if (!availability.isAvailable) {
            status = 'out_of_stock';
            
            // Try to find substitute
            const alternatives = await this.findDrugAlternatives(medication.drugCode);
            if (alternatives.length > 0) {
              status = 'substitute_suggested';
              substitute = {
                drugCode: alternatives[0].registrationNumber,
                drugName: alternatives[0].productName,
                reason: 'Original medication out of stock - generic equivalent suggested'
              };
            }
          }

          const unitPrice = availability.price || drugInfo.price?.amount || 0;
          const totalPrice = unitPrice * medication.quantity;
          subtotal += totalPrice;

          // Check halal status if required
          let halalStatus: 'halal' | 'haram' | 'syubhah' | 'unknown' = 'unknown';
          if (prescription.culturalRequirements?.requiresHalal) {
            const halalValidation = await this.halalService.validateMedication({
              drugName: drugInfo.productName,
              ingredients: drugInfo.genericName,
              manufacturer: drugInfo.manufacturer
            });
            halalStatus = halalValidation.isHalal ? 'halal' : 'haram';
          }

          result.processedMedications.push({
            drugCode: medication.drugCode,
            drugName: medication.drugName,
            status,
            quantity: medication.quantity,
            unitPrice,
            totalPrice,
            halalStatus,
            substitute
          });

        } catch (error) {
          result.errors.push(`Failed to process ${medication.drugName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Calculate final costs
      const tax = subtotal * 0.06; // 6% GST in Malaysia
      result.totalCost = {
        subtotal,
        tax,
        total: subtotal + tax,
        currency: 'MYR'
      };

      result.success = result.errors.length === 0;

      // Submit to pharmacy system
      if (result.success) {
        try {
          await this.submitToPharmacySystem(pharmacyId, prescription, result);
        } catch (error) {
          result.errors.push(`Pharmacy submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.success = false;
        }
      }

      // Store prescription submission
      await this.storePrescriptionSubmission(prescription, result);

      return result;

    } catch (error) {
      console.error('Prescription submission failed:', error);
      throw new Error(`Prescription submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pharmacy network information
   */
  public async getPharmacyNetwork(networkId?: string): Promise<PharmacyNetwork[]> {
    try {
      const connection = this.db.getConnection();
      
      const query = networkId ? 
        'SELECT * FROM pharmacy_networks WHERE network_id = $1' :
        'SELECT * FROM pharmacy_networks WHERE is_active = true';
      
      const params = networkId ? [networkId] : [];
      const networks = await connection.manyOrNone(query, params);

      const result: PharmacyNetwork[] = [];

      for (const network of networks) {
        const pharmacies = await connection.manyOrNone(
          'SELECT * FROM pharmacies WHERE network_id = $1 AND is_active = true',
          [network.network_id]
        );

        result.push({
          networkId: network.network_id,
          networkName: network.network_name,
          pharmacies: pharmacies.map((pharmacy: any) => ({
            pharmacyId: pharmacy.pharmacy_id,
            pharmacyName: pharmacy.pharmacy_name,
            license: pharmacy.license,
            location: {
              address: pharmacy.address,
              city: pharmacy.city,
              state: pharmacy.state,
              postalCode: pharmacy.postal_code,
              coordinates: pharmacy.coordinates ? JSON.parse(pharmacy.coordinates) : undefined
            },
            operatingHours: JSON.parse(pharmacy.operating_hours),
            services: pharmacy.services || [],
            specialties: pharmacy.specialties || [],
            acceptedInsurance: pharmacy.accepted_insurance || [],
            contactInfo: JSON.parse(pharmacy.contact_info),
            isActive: pharmacy.is_active,
            lastUpdated: pharmacy.last_updated
          }))
        });
      }

      return result;

    } catch (error) {
      console.error('Failed to get pharmacy network:', error);
      throw new Error(`Failed to get pharmacy network: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync drug database with DRA (Drug Registration Authority)
   */
  public async syncDrugDatabase(): Promise<{ synced: number; errors: number }> {
    try {
      const response = await this.axiosInstance.get('/dra/drugs', {
        baseURL: this.config.draApiUrl
      });

      let synced = 0;
      let errors = 0;
      const connection = this.db.getConnection();

      for (const drug of response.data.drugs) {
        try {
          await connection.none(`
            INSERT INTO malaysian_drug_database (
              registration_number, product_name, generic_name, manufacturer,
              strength, dosage_form, administration_route, indication,
              contraindications, side_effects, drug_interactions,
              halal_status, registration_date, expiry_date,
              registration_status, price_myr, subsidized,
              availability_status, last_updated, data_source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), 'DRA')
            ON CONFLICT (registration_number)
            DO UPDATE SET
              product_name = $2, generic_name = $3, manufacturer = $4,
              strength = $5, dosage_form = $6, administration_route = $7,
              indication = $8, contraindications = $9, side_effects = $10,
              drug_interactions = $11, halal_status = $12,
              registration_date = $13, expiry_date = $14,
              registration_status = $15, price_myr = $16,
              subsidized = $17, availability_status = $18,
              last_updated = NOW(), data_source = 'DRA'
          `, [
            drug.registrationNumber,
            drug.productName,
            drug.genericName,
            drug.manufacturer,
            drug.strength,
            drug.dosageForm,
            drug.route,
            drug.indication,
            drug.contraindications,
            drug.sideEffects,
            drug.drugInteractions,
            drug.halalStatus || 'unknown',
            drug.registrationDate,
            drug.expiryDate,
            drug.status,
            drug.price,
            drug.subsidized || false,
            drug.availability || 'available'
          ]);

          synced++;
        } catch (error) {
          console.error(`Failed to sync drug ${drug.registrationNumber}:`, error);
          errors++;
        }
      }

      console.log(`Drug database sync completed: ${synced} synced, ${errors} errors`);
      return { synced, errors };

    } catch (error) {
      console.error('Drug database sync failed:', error);
      throw new Error(`Drug database sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadConfig(): PharmacyConfig {
    return {
      draApiUrl: process.env.DRA_API_URL || 'https://api.dra.gov.my',
      pharmacyNetworkUrl: process.env.PHARMACY_NETWORK_URL || 'https://pharmacy-network.moh.gov.my/api',
      halalCertificationUrl: process.env.HALAL_CERT_URL || 'https://halal.jakim.gov.my/api',
      pricingApiUrl: process.env.DRUG_PRICING_API_URL || 'https://pricing.moh.gov.my/api',
      stockApiUrl: process.env.PHARMACY_STOCK_API_URL || 'https://stock.pharmacy.gov.my/api',
      timeout: parseInt(process.env.PHARMACY_API_TIMEOUT || '30000'),
      apiKey: process.env.PHARMACY_API_KEY || ''
    };
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.pharmacyNetworkUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'MediMate-Malaysia-Pharmacy/1.0.0'
      }
    });
  }

  private async getDrugInformation(drugCode: string): Promise<MalaysianDrugInfo | null> {
    try {
      const connection = this.db.getConnection();
      const drug = await connection.oneOrNone(
        'SELECT * FROM malaysian_drug_database WHERE registration_number = $1 OR product_name ILIKE $2',
        [drugCode, `%${drugCode}%`]
      );

      if (drug) {
        return {
          registrationNumber: drug.registration_number,
          productName: drug.product_name,
          genericName: drug.generic_name,
          manufacturer: drug.manufacturer,
          strength: drug.strength,
          dosageForm: drug.dosage_form,
          route: drug.administration_route,
          indication: drug.indication,
          contraindications: drug.contraindications || [],
          sideEffects: drug.side_effects || [],
          drugInteractions: drug.drug_interactions || [],
          halalStatus: drug.halal_status,
          price: drug.price_myr ? {
            amount: parseFloat(drug.price_myr),
            currency: 'MYR',
            subsidized: drug.subsidized
          } : undefined,
          availability: drug.availability_status,
          lastUpdated: drug.last_updated
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get drug information:', error);
      return null;
    }
  }

  private async checkPharmacyNetworkAvailability(drugCode: string, patientLocation?: { latitude: number; longitude: number }): Promise<any[]> {
    try {
      const response = await axios.get(`${this.config.stockApiUrl}/availability`, {
        params: {
          drugCode,
          patientLatitude: patientLocation?.latitude,
          patientLongitude: patientLocation?.longitude,
          radius: 50 // km
        },
        headers: {
          'X-API-Key': this.config.apiKey
        }
      });

      return response.data.pharmacies || [];
    } catch (error) {
      console.error('Failed to check pharmacy network availability:', error);
      return [];
    }
  }

  private async checkPharmacyDrugAvailability(pharmacyId: string, drugCode: string): Promise<{ isAvailable: boolean; price?: number }> {
    try {
      const response = await axios.get(`${this.config.stockApiUrl}/pharmacy/${pharmacyId}/drug/${drugCode}`, {
        headers: {
          'X-API-Key': this.config.apiKey
        }
      });

      return {
        isAvailable: response.data.stockLevel > 0,
        price: response.data.price
      };
    } catch (error) {
      console.error('Failed to check pharmacy drug availability:', error);
      return { isAvailable: false };
    }
  }

  private async getHalalCertification(drugCode: string): Promise<any> {
    try {
      const response = await axios.get(`${this.config.halalCertificationUrl}/drug/${drugCode}`, {
        headers: {
          'X-API-Key': this.config.apiKey
        }
      });

      return response.data.halalCertification || {
        status: 'unknown'
      };
    } catch (error) {
      console.error('Failed to get halal certification:', error);
      return { status: 'unknown' };
    }
  }

  private async findDrugAlternatives(drugCode: string): Promise<MalaysianDrugInfo[]> {
    try {
      const drugInfo = await this.getDrugInformation(drugCode);
      if (!drugInfo) return [];

      const connection = this.db.getConnection();
      const alternatives = await connection.manyOrNone(`
        SELECT * FROM malaysian_drug_database 
        WHERE generic_name = $1 
          AND registration_number != $2
          AND availability_status = 'available'
          AND registration_status = 'active'
        ORDER BY price_myr ASC
        LIMIT 5
      `, [drugInfo.genericName, drugInfo.registrationNumber]);

      return alternatives.map((alt: any) => ({
        registrationNumber: alt.registration_number,
        productName: alt.product_name,
        genericName: alt.generic_name,
        manufacturer: alt.manufacturer,
        strength: alt.strength,
        dosageForm: alt.dosage_form,
        route: alt.administration_route,
        indication: alt.indication,
        contraindications: alt.contraindications || [],
        sideEffects: alt.side_effects || [],
        drugInteractions: alt.drug_interactions || [],
        halalStatus: alt.halal_status,
        price: alt.price_myr ? {
          amount: parseFloat(alt.price_myr),
          currency: 'MYR',
          subsidized: alt.subsidized
        } : undefined,
        availability: alt.availability_status,
        lastUpdated: alt.last_updated
      }));

    } catch (error) {
      console.error('Failed to find drug alternatives:', error);
      return [];
    }
  }

  private calculateOverallStockLevel(pharmacyAvailability: any[]): 'high' | 'medium' | 'low' | 'out_of_stock' {
    const availablePharmacies = pharmacyAvailability.filter(p => p.stockLevel > 0);
    
    if (availablePharmacies.length === 0) return 'out_of_stock';
    if (availablePharmacies.length >= 5) return 'high';
    if (availablePharmacies.length >= 2) return 'medium';
    return 'low';
  }

  private calculateAgeFromDateOfBirth(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private async submitToPharmacySystem(pharmacyId: string, prescription: PrescriptionSubmission, result: PharmacyIntegrationResult): Promise<void> {
    try {
      const response = await this.axiosInstance.post(`/pharmacy/${pharmacyId}/prescriptions`, {
        prescriptionId: prescription.prescriptionId,
        transactionId: result.transactionId,
        patientInfo: prescription.patientInfo,
        practitionerInfo: prescription.practitionerInfo,
        medications: result.processedMedications.filter(m => m.status === 'available'),
        totalCost: result.totalCost,
        specialInstructions: prescription.specialInstructions,
        culturalRequirements: prescription.culturalRequirements
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Pharmacy system rejected prescription');
      }

    } catch (error) {
      console.error('Failed to submit to pharmacy system:', error);
      throw error;
    }
  }

  private async storeAvailabilityCheck(availability: DrugAvailabilityCheck): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO drug_availability_checks (
          id, drug_code, drug_name, is_available, stock_level,
          price_amount, price_currency, pharmacies_data,
          halal_certification, alternatives_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        uuidv4(),
        availability.drugCode,
        availability.drugName,
        availability.isAvailable,
        availability.stockLevel,
        availability.price.amount,
        availability.price.currency,
        JSON.stringify(availability.pharmacies),
        JSON.stringify(availability.halalCertification),
        JSON.stringify(availability.alternatives)
      ]);
    } catch (error) {
      console.error('Failed to store availability check:', error);
    }
  }

  private async storePrescriptionSubmission(prescription: PrescriptionSubmission, result: PharmacyIntegrationResult): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO pharmacy_prescription_submissions (
          id, prescription_id, pharmacy_id, transaction_id,
          patient_info, practitioner_info, medications_data,
          processed_medications, total_cost, success,
          warnings, errors, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        uuidv4(),
        prescription.prescriptionId,
        result.pharmacyId,
        result.transactionId,
        JSON.stringify(prescription.patientInfo),
        JSON.stringify(prescription.practitionerInfo),
        JSON.stringify(prescription.medications),
        JSON.stringify(result.processedMedications),
        JSON.stringify(result.totalCost),
        result.success,
        JSON.stringify(result.warnings),
        JSON.stringify(result.errors)
      ]);
    } catch (error) {
      console.error('Failed to store prescription submission:', error);
    }
  }
}

export default PharmacyIntegrationService;