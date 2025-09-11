# MediMate Malaysia Healthcare API Documentation

## Overview

The MediMate Malaysia Healthcare API provides comprehensive healthcare data management with integrated Malaysian cultural intelligence, PDPA compliance, and multi-language support. This API serves as the core backend for healthcare applications in Malaysia, ensuring cultural sensitivity, regulatory compliance, and optimal user experience for Malaysian healthcare providers and patients.

## Base URL

```
Development: http://localhost:3000
Production: https://api.medimate.my
```

## Authentication

All healthcare endpoints require authentication using Bearer tokens:

```
Authorization: Bearer <your-jwt-token>
```

### Test Tokens (Development Only)
- Patient: `test-token`
- Admin: `admin-token`
- DPO: `dpo-token`

## Cultural Headers

The API supports Malaysian cultural context through optional headers:

```
X-Malaysian-State: KUL|SGR|JHR|PNG|SBH|SWK (Malaysian state code)
X-Cultural-Context: Malaysian-Healthcare
X-PDPA-Consent: active
Accept-Language: ms,en,zh,ta (Supported languages)
```

## Core API Endpoints

### 1. Health Check Endpoints

#### Basic Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-09T10:30:00.000Z",
  "system": "MediMate Malaysia Backend",
  "version": "1.0.0",
  "cultural_context": {
    "timezone": "Asia/Kuala_Lumpur",
    "supported_languages": ["ms", "en", "zh", "ta"],
    "islamic_features": true,
    "multi_cultural": true
  }
}
```

#### Detailed Health Check
```http
GET /health/detailed
```

### 2. Malaysian Cultural Intelligence

#### Get Cultural Context
```http
GET /api/v1/cultural/context?state=KUL&language=ms
```

#### Get Prayer Times
```http
GET /api/v1/prayer-times?state=KUL&date=2024-01-09
```

**Response:**
```json
{
  "success": true,
  "data": {
    "location": { "state": "KUL", "city": "Kuala Lumpur" },
    "date": "2024-01-09",
    "prayer_times": {
      "fajr": "05:45",
      "dhuhr": "13:15",
      "asr": "16:30",
      "maghrib": "19:20",
      "isha": "20:35"
    },
    "healthcare_considerations": {
      "appointment_scheduling": {
        "avoid_during_prayers": true,
        "buffer_before_prayers": 15,
        "buffer_after_prayers": 15
      }
    }
  }
}
```

#### Get Malaysian Holidays
```http
GET /api/v1/holidays?year=2024&state=KUL
```

### 3. Patient Management API

#### Get Patient Profile
```http
GET /api/v1/patients/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "patient-123",
      "full_name": "Ahmad bin Hassan",
      "ic_number": "890123-10-1234",
      "phone_number": "+60123456789",
      "primary_language": "ms",
      "cultural_context": {
        "religious_considerations": {
          "primary_religion": "islam",
          "prayer_times_relevant": true,
          "dietary_restrictions": ["halal_only"]
        },
        "language_services": {
          "primary": "ms",
          "interpretation_available": true
        }
      }
    },
    "malaysian_services": {
      "moh_integration": "active",
      "ic_validation_status": "verified",
      "cultural_intelligence": "enabled"
    }
  }
}
```

#### Update Patient Profile
```http
PUT /api/v1/patients/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone_number": "+60123456789",
  "cultural_preferences": {
    "prayer_time_scheduling": true,
    "family_involvement": "high"
  },
  "dietary_restrictions": ["halal_only", "low_sodium"],
  "language_preference": "ms"
}
```

#### Get Emergency Contacts
```http
GET /api/v1/patients/emergency-contacts
Authorization: Bearer <token>
```

### 4. Medication Management API

#### Get User Medications
```http
GET /api/v1/medications?status=active&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "medications": [
      {
        "id": "med-123",
        "medication_name": "Paracetamol",
        "dosage": "500mg",
        "frequency": "twice daily",
        "halal_status": "certified",
        "cultural_considerations": {
          "halal_considerations": {
            "status": "certified_halal",
            "gelatin_capsule": false,
            "alcohol_content": false
          },
          "prayer_time_considerations": {
            "avoid_during_prayers": true,
            "aligned_schedule": ["08:30", "21:00"]
          }
        }
      }
    ],
    "malaysian_context": {
      "pharmacy_network": "integrated",
      "moh_drug_registry": "accessible",
      "halal_certification": "verified_where_applicable"
    }
  }
}
```

#### Add New Medication
```http
POST /api/v1/medications
Authorization: Bearer <token>
Content-Type: application/json

{
  "medication_name": "Metformin",
  "generic_name": "Metformin HCl",
  "dosage": "500mg",
  "frequency": "twice daily",
  "start_date": "2024-01-09",
  "prescribed_by": "Dr. Ahmad Rahman",
  "cultural_preferences": {
    "prayer_avoidance": true,
    "halal_verification": true
  }
}
```

#### Search Malaysian Drug Registry
```http
GET /api/v1/medications/registry/search?q=paracetamol&halal_only=true
```

### 5. Healthcare Providers API

#### Search Healthcare Providers
```http
GET /api/v1/providers/search?specialty=general&state=KUL&language=ms&cultural_competency=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "provider-001",
        "name": "Dr. Ahmad Rahman bin Hassan",
        "specialty": "General Practice",
        "gender": "male",
        "languages": ["ms", "en", "ar"],
        "moh_registration": "MOH12345-A",
        "cultural_services": {
          "languages_spoken": ["ms", "en", "ar"],
          "cultural_competency_training": true,
          "religious_sensitivity": true,
          "interpreter_services": true
        },
        "patient_preferences_compatibility": {
          "gender_match": true,
          "language_support": true,
          "cultural_understanding": true,
          "religious_accommodation": true
        }
      }
    ],
    "malaysian_healthcare_network": {
      "moh_verified_providers": 156,
      "cultural_competency_certified": 124
    }
  }
}
```

#### Get Provider Details
```http
GET /api/v1/providers/{providerId}?include_reviews=true&language=ms
Authorization: Bearer <token>
```

#### Get Provider Availability
```http
GET /api/v1/providers/{providerId}/availability?start_date=2024-01-09&avoid_prayer_times=true
Authorization: Bearer <token>
```

### 6. Appointment Management API

#### Get User Appointments
```http
GET /api/v1/appointments?status=scheduled&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "apt-001",
        "provider_name": "Dr. Ahmad Rahman",
        "appointment_date": "2024-01-18",
        "appointment_time": "10:00",
        "appointment_type": "General Consultation",
        "status": "scheduled",
        "malaysian_context": {
          "prayer_time_status": "No prayer time conflict",
          "cultural_considerations": {
            "prayer_time_avoided": true,
            "family_consultation_time": 15
          }
        }
      }
    ],
    "malaysian_features": {
      "prayer_time_integration": "active",
      "public_holiday_awareness": "enabled",
      "cultural_preferences_applied": "personalized"
    }
  }
}
```

#### Book New Appointment
```http
POST /api/v1/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_id": "provider-001",
  "appointment_type": "General Consultation",
  "preferred_date": "2024-01-18",
  "preferred_time": "10:00",
  "chief_complaint": "Regular health checkup",
  "avoid_prayer_times": true,
  "family_consultation": false,
  "cultural_preferences": {
    "language": "ms",
    "interpreter_needed": false
  }
}
```

#### Reschedule Appointment
```http
PUT /api/v1/appointments/{appointmentId}/reschedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "new_date": "2024-01-20",
  "new_time": "14:30",
  "reason": "Schedule conflict",
  "maintain_cultural_preferences": true
}
```

### 7. Medical Records API

#### Get Medical Records
```http
GET /api/v1/medical-records?start_date=2023-01-01&record_type=consultation
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "medical_records": [
      {
        "id": "record-001",
        "provider_name": "Dr. Ahmad Rahman",
        "record_type": "consultation",
        "visit_date": "2024-01-15",
        "chief_complaint": "Regular health checkup",
        "primary_diagnosis": "Hypertension - well controlled",
        "malaysian_context": {
          "cultural_factors": {
            "dietary_advice_given": true,
            "prayer_time_medication_discussed": true
          },
          "language_used": "ms"
        },
        "pdpa_compliance": {
          "consent_status": "active",
          "data_retention_period": "7_years",
          "audit_trail_available": true
        }
      }
    ]
  }
}
```

#### Get Specific Medical Record
```http
GET /api/v1/medical-records/{recordId}?include_documents=true&language=ms
Authorization: Bearer <token>
```

### 8. Emergency Access API

#### Request Emergency Access
```http
POST /api/v1/emergency-access/request
Authorization: Bearer <emergency-responder-token>
Content-Type: application/json

{
  "patient_identifier": "890123-10-1234",
  "emergency_type": "cardiac_arrest",
  "emergency_location": "Hospital Kuala Lumpur Emergency Department",
  "justification": "Patient in cardiac arrest, immediate access to medical history and allergies required for life-saving treatment",
  "urgency_level": "immediate",
  "estimated_access_duration": 120,
  "facility_name": "Hospital Kuala Lumpur",
  "supervisor_contact": "+60312345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency access granted",
  "data": {
    "emergency_access_request": {
      "id": "emergency-001",
      "status": "approved",
      "access_granted_until": "2024-01-09T14:00:00.000Z",
      "auto_approval_eligible": true
    },
    "patient_emergency_data": {
      "critical_medical_information": {
        "blood_type": "B+",
        "known_allergies": ["penicillin", "shellfish"],
        "current_medications": ["Amlodipine 5mg daily"],
        "medical_conditions": ["Hypertension"]
      }
    },
    "malaysian_emergency_protocols": {
      "moh_emergency_guidelines": "applicable",
      "pdpa_emergency_provisions": "invoked",
      "audit_requirements": "comprehensive_logging_active"
    }
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-09T10:30:00.000Z",
  "cultural_message": {
    "en": "English error message",
    "ms": "Mesej ralat dalam Bahasa Malaysia",
    "zh": "中文错误信息",
    "ta": "தமிழ் பிழை செய்தி"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

## Malaysian Cultural Features

### Prayer Time Integration
- Automatic prayer time avoidance in appointment scheduling
- Cultural buffer times (15 minutes before/after prayers)
- Friday prayer considerations (extended break 12:00-14:30)

### Language Support
- Primary languages: Malay (ms), English (en), Chinese (zh), Tamil (ta)
- Real-time translation for medical terms
- Cultural interpreter services

### Halal Compliance
- Medication halal certification verification
- Dietary restriction integration
- Religious consideration in treatment plans

### Family Involvement
- Cultural preference for family consultation
- Elder respect in healthcare decisions
- Emergency contact prioritization based on relationships

## PDPA Compliance Features

### Data Protection
- Comprehensive audit logging
- Data subject rights implementation
- 7-year healthcare data retention
- Automatic anonymization scheduling

### Consent Management
- Granular consent tracking
- Consent withdrawal mechanisms
- Real-time consent validation

### Security Measures
- Healthcare-grade encryption
- Access control based on roles
- Emergency access with audit trails

## Rate Limits

- Cultural endpoints: 200 requests/15 minutes
- Patient data endpoints: 50 requests/15 minutes
- General endpoints: 100 requests/15 minutes
- Emergency access: No limits (monitored)

## SDK and Libraries

Coming soon:
- JavaScript/TypeScript SDK
- React Native SDK
- iOS Swift SDK
- Android Kotlin SDK

## Support

For API support and integration assistance:
- Email: api-support@medimate.my
- Documentation: https://docs.medimate.my
- Status Page: https://status.medimate.my

## Changelog

### v1.0.0 (2024-01-09)
- Initial release with core healthcare APIs
- Malaysian cultural intelligence integration
- PDPA compliance framework
- Multi-language support
- Emergency access protocols