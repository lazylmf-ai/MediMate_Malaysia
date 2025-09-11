/**
 * Documentation Service
 * 
 * Provides access to API documentation, guides, and resources
 * for Malaysian healthcare integration
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../types';

export interface PostmanCollection {
  info: {
    name: string;
    description: string;
    version: string;
  };
  variable: Array<{
    key: string;
    value: string;
    type: string;
  }>;
  item: any[];
}

export class DocumentationService {
  /**
   * Download Postman collection with Malaysian healthcare examples
   */
  async downloadPostmanCollection(): Promise<ApiResponse<PostmanCollection>> {
    return apiClient.request<PostmanCollection>(
      API_ENDPOINTS.DOCUMENTATION.POSTMAN_COLLECTION,
      {
        skipAuth: true,
        cacheKey: 'postman_collection',
        cacheTTL: 3600000, // 1 hour cache
      }
    );
  }

  /**
   * Generate custom Postman collection based on API key permissions
   */
  async generateCustomPostmanCollection(
    apiKeyPermissions: string[],
    culturalFeatures?: {
      prayerTimes: boolean;
      halalValidation: boolean;
      translation: boolean;
      culturalCalendar: boolean;
    }
  ): Promise<ApiResponse<PostmanCollection>> {
    // In a real implementation, this would call a backend service
    // For now, we'll generate a custom collection based on permissions

    const collection: PostmanCollection = {
      info: {
        name: 'MediMate Malaysia API - Custom Collection',
        description: 'Custom Postman collection based on your API key permissions and cultural features',
        version: '1.0.0',
      },
      variable: [
        {
          key: 'baseUrl',
          value: '{{baseUrl}}',
          type: 'string',
        },
        {
          key: 'apiKey',
          value: '{{apiKey}}',
          type: 'string',
        },
      ],
      item: [],
    };

    // Add endpoints based on permissions
    const endpointGroups: Record<string, any> = {};

    // Patient management endpoints
    if (apiKeyPermissions.includes('read_patients') || apiKeyPermissions.includes('write_patients')) {
      endpointGroups['Patient Management'] = {
        name: 'Patient Management',
        description: 'Endpoints for managing patient records with Malaysian cultural context',
        item: [],
      };

      if (apiKeyPermissions.includes('read_patients')) {
        endpointGroups['Patient Management'].item.push({
          name: 'List Patients',
          request: {
            method: 'GET',
            url: '{{baseUrl}}/patients',
            header: [
              { key: 'Authorization', value: 'Bearer {{apiKey}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
          },
          response: [],
        });

        endpointGroups['Patient Management'].item.push({
          name: 'Get Patient by ID',
          request: {
            method: 'GET',
            url: '{{baseUrl}}/patients/:patientId',
            header: [
              { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            ],
          },
          response: [],
        });
      }

      if (apiKeyPermissions.includes('write_patients')) {
        endpointGroups['Patient Management'].item.push({
          name: 'Create Patient',
          request: {
            method: 'POST',
            url: '{{baseUrl}}/patients',
            header: [
              { key: 'Authorization', value: 'Bearer {{apiKey}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                personal_info: {
                  name: 'Ahmad bin Abdullah',
                  mykad_number: '800101-01-1234',
                  date_of_birth: '1980-01-01',
                  gender: 'male',
                  race: 'Malay',
                  religion: 'Islam',
                  nationality: 'Malaysian',
                },
                contact_info: {
                  phone: '+60123456789',
                  email: 'ahmad.abdullah@email.com',
                  address: {
                    street: '123 Jalan Merdeka',
                    city: 'Kuala Lumpur',
                    state: 'Kuala Lumpur',
                    postcode: '50000',
                    country: 'Malaysia',
                  },
                },
                cultural_preferences: {
                  primary_language: 'ms',
                  secondary_languages: ['en'],
                  prayer_time_notifications: true,
                  halal_medication_only: true,
                  preferred_gender_provider: 'same',
                },
                pdpa_consent: {
                  data_processing: true,
                  marketing: false,
                  third_party_sharing: false,
                  consent_date: new Date().toISOString(),
                },
              }, null, 2),
            },
          },
          response: [],
        });
      }
    }

    // Cultural intelligence endpoints
    if (culturalFeatures?.prayerTimes && apiKeyPermissions.includes('prayer_times')) {
      if (!endpointGroups['Cultural Intelligence']) {
        endpointGroups['Cultural Intelligence'] = {
          name: 'Cultural Intelligence',
          description: 'Endpoints for Malaysian cultural services',
          item: [],
        };
      }

      endpointGroups['Cultural Intelligence'].item.push({
        name: 'Get Prayer Times',
        request: {
          method: 'GET',
          url: '{{baseUrl}}/cultural/prayer-times/KUL',
          header: [
            { key: 'X-Malaysian-State', value: 'KUL' },
          ],
        },
        response: [],
      });

      endpointGroups['Cultural Intelligence'].item.push({
        name: 'Get Current Prayer Status',
        request: {
          method: 'GET',
          url: '{{baseUrl}}/cultural/prayer-times/KUL/current',
          header: [
            { key: 'X-Malaysian-State', value: 'KUL' },
          ],
        },
        response: [],
      });
    }

    if (culturalFeatures?.halalValidation && apiKeyPermissions.includes('halal_validation')) {
      if (!endpointGroups['Cultural Intelligence']) {
        endpointGroups['Cultural Intelligence'] = {
          name: 'Cultural Intelligence',
          description: 'Endpoints for Malaysian cultural services',
          item: [],
        };
      }

      endpointGroups['Cultural Intelligence'].item.push({
        name: 'Validate Medication Halal Status',
        request: {
          method: 'POST',
          url: '{{baseUrl}}/cultural/halal/validate-medication',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              medication_name: 'Paracetamol 500mg',
              manufacturer: 'Duopharma Biotech',
              active_ingredients: ['paracetamol'],
            }, null, 2),
          },
        },
        response: [],
      });
    }

    if (culturalFeatures?.translation && apiKeyPermissions.includes('translation_access')) {
      if (!endpointGroups['Cultural Intelligence']) {
        endpointGroups['Cultural Intelligence'] = {
          name: 'Cultural Intelligence',
          description: 'Endpoints for Malaysian cultural services',
          item: [],
        };
      }

      endpointGroups['Cultural Intelligence'].item.push({
        name: 'Translate Healthcare Text',
        request: {
          method: 'POST',
          url: '{{baseUrl}}/cultural/translate',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept-Language', value: 'ms' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              text: 'Take this medication twice daily after meals',
              target_language: 'ms',
              source_language: 'en',
              context: {
                domain: 'prescription',
                urgency: 'medium',
              },
            }, null, 2),
          },
        },
        response: [],
      });
    }

    // Convert endpointGroups to array
    collection.item = Object.values(endpointGroups);

    return {
      success: true,
      data: collection,
    };
  }

  /**
   * Get API documentation summary
   */
  async getApiDocumentationSummary(): Promise<ApiResponse<{
    totalEndpoints: number;
    endpointsByCategory: Record<string, number>;
    culturalFeatures: {
      prayerTimeIntegration: boolean;
      halalValidation: boolean;
      multiLanguageSupport: boolean;
      culturalCalendar: boolean;
    };
    complianceStandards: {
      pdpa2010: boolean;
      fhirR4: boolean;
      mohGuidelines: boolean;
    };
    supportedLanguages: string[];
    supportedStates: string[];
  }>> {
    return {
      success: true,
      data: {
        totalEndpoints: 19,
        endpointsByCategory: {
          'Health & System': 2,
          'Cultural Intelligence': 5,
          'Patient Management': 3,
          'Appointment Management': 2,
          'Medication Management': 2,
          'Real-time Services': 2,
          'FHIR Integration': 1,
          'Developer Portal': 3,
          'Documentation': 1,
        },
        culturalFeatures: {
          prayerTimeIntegration: true,
          halalValidation: true,
          multiLanguageSupport: true,
          culturalCalendar: true,
        },
        complianceStandards: {
          pdpa2010: true,
          fhirR4: true,
          mohGuidelines: true,
        },
        supportedLanguages: ['ms', 'en', 'zh', 'ta'],
        supportedStates: ['KUL', 'SGR', 'JHR', 'PNG', 'PRK', 'KDH', 'TRG', 'KEL', 'PAH', 'MLK', 'N9', 'SBH', 'SWK', 'LBN', 'PJY'],
      },
    };
  }

  /**
   * Get getting started guide for Malaysian healthcare integration
   */
  async getGettingStartedGuide(): Promise<ApiResponse<{
    steps: Array<{
      title: string;
      description: string;
      code_example?: string;
      cultural_notes?: string[];
    }>;
    cultural_considerations: {
      essential: string[];
      recommended: string[];
      optional: string[];
    };
    compliance_checklist: Array<{
      item: string;
      required: boolean;
      description: string;
    }>;
  }>> {
    return {
      success: true,
      data: {
        steps: [
          {
            title: '1. Create API Key',
            description: 'Register for a developer account and create your first API key with Malaysian cultural features',
            code_example: `
// Example: Creating an API key with cultural features
const apiKeyRequest = {
  name: "My Healthcare App",
  permissions: ["read_patients", "cultural_services", "prayer_times", "halal_validation"],
  environment: "development",
  cultural_features: {
    prayer_time_access: true,
    halal_validation_access: true,
    translation_access: true,
    cultural_calendar_access: true
  },
  malaysian_compliance: {
    pdpa_compliant: true,
    audit_trail: true
  }
};`,
            cultural_notes: [
              'Enable cultural features for Malaysian healthcare context',
              'PDPA compliance is mandatory for all production applications',
            ],
          },
          {
            title: '2. Authentication Setup',
            description: 'Configure API authentication with Bearer token',
            code_example: `
// Example: API client setup with authentication
const apiClient = {
  baseURL: 'https://api.medimate.my/v1',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
    'Accept-Language': 'ms', // For Bahasa Malaysia responses
    'X-Malaysian-State': 'KUL' // For location-specific services
  }
};`,
            cultural_notes: [
              'Use Accept-Language header for multi-language support',
              'Set X-Malaysian-State for prayer times and location-specific services',
            ],
          },
          {
            title: '3. Patient Management Integration',
            description: 'Integrate patient management with Malaysian cultural context',
            code_example: `
// Example: Creating a patient with cultural preferences
const patient = {
  personal_info: {
    name: "Siti Aminah",
    mykad_number: "850315-01-2345",
    religion: "Islam",
    race: "Malay"
  },
  cultural_preferences: {
    primary_language: "ms",
    prayer_time_notifications: true,
    halal_medication_only: true,
    preferred_gender_provider: "same"
  },
  pdpa_consent: {
    data_processing: true,
    marketing: false,
    third_party_sharing: false
  }
};`,
            cultural_notes: [
              'MyKad number validation is built-in',
              'Cultural preferences affect medication recommendations',
              'PDPA consent tracking is automated',
            ],
          },
          {
            title: '4. Cultural Services Integration',
            description: 'Leverage Malaysian cultural intelligence services',
            code_example: `
// Example: Check prayer times before scheduling
const prayerTimes = await fetch('/cultural/prayer-times/KUL/current');
const isRamadan = await fetch('/cultural/calendar/ramadan/2024');
const halalStatus = await fetch('/cultural/halal/validate-medication', {
  method: 'POST',
  body: JSON.stringify({ medication_name: 'Paracetamol 500mg' })
});`,
            cultural_notes: [
              'Always check prayer times for appointment scheduling',
              'Ramadan considerations affect medication timing',
              'Halal validation is essential for Muslim patients',
            ],
          },
        ],
        cultural_considerations: {
          essential: [
            'Prayer time integration for appointment scheduling',
            'Halal medication validation for Muslim patients',
            'PDPA 2010 compliance for data handling',
            'MyKad number validation and processing',
          ],
          recommended: [
            'Multi-language support (Bahasa Malaysia, English, Chinese, Tamil)',
            'Ramadan-specific scheduling adjustments',
            'Cultural calendar event awareness',
            'Gender preference considerations',
          ],
          optional: [
            'Cultural dietary restrictions beyond halal',
            'Traditional medicine integration',
            'Cultural ceremony scheduling avoidance',
            'Extended family notification preferences',
          ],
        },
        compliance_checklist: [
          {
            item: 'PDPA 2010 consent collection and tracking',
            required: true,
            description: 'All patient data processing must have explicit consent',
          },
          {
            item: 'MyKad number validation and security',
            required: true,
            description: 'Proper handling of Malaysian national identification numbers',
          },
          {
            item: 'Healthcare provider registration verification',
            required: true,
            description: 'Verify healthcare providers are registered with Malaysian Medical Council',
          },
          {
            item: 'Cultural sensitivity training documentation',
            required: false,
            description: 'Document cultural awareness training for development teams',
          },
          {
            item: 'Multi-language user interface testing',
            required: false,
            description: 'Test application in all supported Malaysian languages',
          },
        ],
      },
    };
  }

  /**
   * Get API changelog and version history
   */
  async getApiChangelog(): Promise<ApiResponse<Array<{
    version: string;
    releaseDate: string;
    changes: {
      added: string[];
      changed: string[];
      deprecated: string[];
      removed: string[];
      fixed: string[];
      cultural: string[];
    };
  }>>> {
    return {
      success: true,
      data: [
        {
          version: '1.0.0',
          releaseDate: '2024-03-15',
          changes: {
            added: [
              'Complete Malaysian healthcare API with cultural intelligence',
              'Prayer time integration for all Malaysian states',
              'Halal medication validation service',
              'Multi-language support (Bahasa Malaysia, English, Chinese, Tamil)',
              'FHIR R4 compliance with Malaysian profiles',
              'Developer portal with sandbox environment',
            ],
            changed: [],
            deprecated: [],
            removed: [],
            fixed: [],
            cultural: [
              'Integrated Islamic prayer times with healthcare scheduling',
              'Added Ramadan-specific healthcare considerations',
              'Implemented Malaysian cultural calendar integration',
              'Added support for cultural dietary restrictions',
              'Included gender preference handling for cultural sensitivity',
            ],
          },
        },
      ],
    };
  }

  /**
   * Generate SDK code examples for different programming languages
   */
  async generateSDKExamples(
    language: 'javascript' | 'python' | 'php' | 'java' | 'swift' | 'kotlin'
  ): Promise<ApiResponse<{
    language: string;
    examples: Array<{
      title: string;
      description: string;
      code: string;
    }>;
  }>> {
    const examples = {
      javascript: [
        {
          title: 'Initialize MediMate Client',
          description: 'Set up the API client with Malaysian cultural context',
          code: `
import { MediMateClient } from '@medimate/malaysia-sdk';

const client = new MediMateClient({
  apiKey: 'your-api-key',
  environment: 'production',
  culturalContext: {
    defaultLanguage: 'ms',
    stateCode: 'KUL',
    enablePrayerTimes: true,
    enableHalalValidation: true
  }
});`,
        },
        {
          title: 'Create Patient with Cultural Profile',
          description: 'Create a patient with Malaysian cultural preferences',
          code: `
const patient = await client.patients.create({
  personal_info: {
    name: 'Ahmad bin Rahman',
    mykad_number: '800101-01-1234',
    religion: 'Islam',
    race: 'Malay'
  },
  cultural_preferences: {
    primary_language: 'ms',
    prayer_time_notifications: true,
    halal_medication_only: true
  }
});`,
        },
        {
          title: 'Schedule Culturally-Aware Appointment',
          description: 'Schedule appointment avoiding prayer times',
          code: `
const appointment = await client.appointments.create({
  patient_id: patient.id,
  provider_id: 'provider-123',
  appointment_date: '2024-04-15',
  appointment_time: '14:00',
  cultural_considerations: {
    avoid_prayer_times: true,
    ramadan_friendly: true,
    preferred_language: 'ms'
  }
});`,
        },
      ],
      python: [
        {
          title: 'Initialize MediMate Client',
          description: 'Set up the API client with Malaysian cultural context',
          code: `
from medimate_malaysia import MediMateClient

client = MediMateClient(
    api_key='your-api-key',
    environment='production',
    cultural_context={
        'default_language': 'ms',
        'state_code': 'KUL',
        'enable_prayer_times': True,
        'enable_halal_validation': True
    }
)`,
        },
      ],
      // Add other languages as needed
    };

    return {
      success: true,
      data: {
        language,
        examples: examples[language] || [],
      },
    };
  }
}

export const documentationService = new DocumentationService();